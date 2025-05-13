import sqlite3 from "sqlite3";
import util from "util";
import { VM } from "vm2";
import { exec } from "child_process";
import fs from "fs/promises";
import os from "os";

const executeController = async (req, res) => {
  const { language, code, sqlHistory = [] } = req.body;

  if (!language || !code) {
    return res.status(400).json({
      error: "El lenguaje y el código son obligatorios.",
    });
  }

  // Validación mejorada para SQL
  if (language === "sql") {
    const trimmedCode = code.trim();
    if (!trimmedCode || trimmedCode === ";") {
      return res.status(400).json({
        error: "El código SQL no puede estar vacío o ser solo un punto y coma.",
      });
    }
    if (
      !trimmedCode.match(/^(select|insert|update|delete|create|alter|drop)/i)
    ) {
      if (trimmedCode.toLowerCase().startsWith("create database")) {
        return res.status(400).json({
          error:
            "CREATE DATABASE no está soportado en SQLite. Usa CREATE TABLE para crear tablas en la base de datos en memoria.",
        });
      }
    }
  }

  try {
    switch (language) {
      case "javascript": {
        const vm = new VM({ timeout: 1000, sandbox: {} });
        const result = vm.run(code);
        res.json({
          output: JSON.stringify(result),
          error: null,
        });
        break;
      }
      case "python": {
        const tempDir = os.tmpdir();
        const file = path.join(tempDir, `script_${Date.now()}.py`);
        try {
          await fs.mkdir(tempDir, { recursive: true });
          await fs.writeFile(file, code);
          const execPromise = util.promisify(exec);
          const { stdout, stderr } = await execPromise(`python3 ${file}`);
          res.json({
            output: stdout,
            error: stderr || null,
          });
        } finally {
          await fs.unlink(file).catch(() => {});
        }
        break;
      }
      case "sql": {
        const db = new sqlite3.Database(":memory:");
        const runQuery = util.promisify(db.run.bind(db));
        const allQuery = util.promisify(db.all.bind(db));

        try {
          // Inicializar la tabla users
          await runQuery(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT,
              age INTEGER
            );
          `);
          await runQuery("INSERT INTO users (name, age) VALUES (?, ?)", [
            "Alice",
            25,
          ]);
          await runQuery("INSERT INTO users (name, age) VALUES (?, ?)", [
            "Bob",
            30,
          ]);

          // Restaurar el historial de consultas SQL exitosas
          for (const prevCode of sqlHistory) {
            const statements = prevCode
              .split(";")
              .map((s) => s.trim())
              .filter((s) => s);
            for (const statement of statements) {
              if (!statement.toLowerCase().startsWith("select")) {
                await runQuery(statement);
              }
            }
          }

          // Separar la consulta actual en instrucciones
          const statements = code
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s);
          let selectResults = null;

          for (const statement of statements) {
            const isSelect = statement.toLowerCase().startsWith("select");
            if (isSelect) {
              selectResults = await allQuery(statement);
            } else {
              await runQuery(statement);
            }
          }

          // Si la última instrucción fue un SELECT, devolver sus resultados
          if (selectResults !== null) {
            res.json({
              output: JSON.stringify(selectResults, null, 2),
              error: null,
              isSuccessful: true, // Indicar que la consulta fue exitosa
            });
          } else {
            // Devolver el estado de todas las tablas, excluyendo sqlite_sequence
            const verifyQuery =
              "SELECT * FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';";
            const tables = await allQuery(verifyQuery);
            const tableData = await Promise.all(
              tables.map(async (table) => {
                const rows = await allQuery(`SELECT * FROM ${table.name}`);
                return { table: table.name, data: rows };
              })
            );
            res.json({
              output: JSON.stringify(tableData, null, 2),
              error: null,
              isSuccessful: true, // Indicar que la consulta fue exitosa
            });
          }
        } catch (error) {
          throw error;
        } finally {
          db.close();
        }
        break;
      }
      default:
        res.status(400).json({
          error: "Lenguaje no soportado para ejecución.",
        });
    }
  } catch (error) {
    console.error(`Error al ejecutar ${language}:`, error);
    res.status(500).json({
      error: `Error al ejecutar ${language}: ${error.message}`,
      isSuccessful: false,
    });
  }
};

export default executeController;
