import Lesson from "../models/LessonModel.js";
import Course from "../models/CourseModel.js";
import * as progressService from "../services/progressService.js";
import * as livesService from "../services/livesService.js"; // Para el sistema de vidas
import { JSDOM } from "jsdom";
import { VM } from "vm2";
import sqlite3 from "sqlite3";
import { exec } from "child_process";
import util from "util";
import { parse } from "css";
import { minify } from "html-minifier";

const execPromise = util.promisify(exec);

// Obtener todas las lecciones de un curso
export const getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    const lessons = await Lesson.find({ course: courseId })
      .sort({ createdAt: 1 })
      .lean();

    const progress = await UserExerciseProgress.find({
      userId,
      courseId,
    }).lean();

    const lessonsWithAccess = lessons.map((lesson, index) => {
      if (index === 0) {
        return { ...lesson, isAccessible: true };
      }
      const previousLesson = lessons[index - 1];
      const previousLessonCompleted = previousLesson.exercises.every(
        (exercise) =>
          progress.some(
            (p) =>
              p.lessonId.toString() === previousLesson._id.toString() &&
              p.exerciseOrder === exercise.order &&
              p.completed
          )
      );
      return { ...lesson, isAccessible: previousLessonCompleted };
    });

    res.json(lessonsWithAccess);
  } catch (error) {
    console.error("Error en getLessonsByCourse:", error.message);
    res.status(500).json({ message: "Error al obtener lecciones" });
  }
};

// Obtener una lección por ID
export const getLessonById = async (req, res) => {
  try {
    const lessonId = req.params.id;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }
    res.json(lesson);
  } catch (error) {
    console.error("Error en getLessonById:", error.message);
    res.status(500).json({ message: "Error al obtener la lección" });
  }
};

// Crear una lección
export const createLesson = async (req, res) => {
  try {
    const { title, description, course, exercises } = req.body;

    if (!title || !description || !course) {
      return res
        .status(400)
        .json({ message: "Título, descripción y curso son obligatorios" });
    }

    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    const newLesson = new Lesson({
      title,
      description,
      course,
      exercises: exercises || [],
    });

    const savedLesson = await newLesson.save();
    res.status(201).json(savedLesson);
  } catch (error) {
    console.error("Error en createLesson:", error.message);
    res.status(500).json({ message: "Error al crear la lección" });
  }
};

// Actualizar una lección
export const updateLesson = async (req, res) => {
  try {
    const { title, description, exercises } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Título y descripción son obligatorios" });
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { title, description, exercises },
      { new: true }
    );

    if (!updatedLesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    res.json(updatedLesson);
  } catch (error) {
    console.error("Error en updateLesson:", error.message);
    res.status(500).json({ message: "Error al actualizar la lección" });
  }
};

// Eliminar una lección
export const deleteLesson = async (req, res) => {
  try {
    const deletedLesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!deletedLesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }
    res.json({ message: "Lección eliminada correctamente" });
  } catch (error) {
    console.error("Error en deleteLesson:", error.message);
    res.status(500).json({ message: "Error al eliminar la lección" });
  }
};

// Obtener todas las lecciones
export const getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find();
    res.status(200).json(lessons);
  } catch (error) {
    console.error("Error en getAllLessons:", error.message);
    res.status(500).json({ message: "Error al obtener las lecciones" });
  }
};

// Obtener un ejercicio por lessonId y order
export const getExerciseByOrder = async (req, res) => {
  try {
    const { courseId, lessonId, order } = req.params;
    const userId = req.user.userId;

    // Verificar vidas
    const lives = await livesService.getLives(userId);
    if (lives <= 0) {
      return res.status(403).json({
        message:
          "No tienes vidas suficientes. Compra más en la tienda o espera a que se recarguen.",
      });
    }

    if (courseId) {
      const canAccess = await progressService.canAccessExercise(
        userId,
        courseId,
        lessonId,
        parseInt(order)
      );
      if (!canAccess) {
        return res.status(403).json({
          message: "Debes completar los ejercicios anteriores primero.",
        });
      }
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    const exercise = lesson.exercises.find(
      (ex) => ex.order === parseInt(order)
    );
    if (!exercise) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    res.json(exercise);
  } catch (error) {
    console.error("Error en getExerciseByOrder:", error.message);
    res.status(500).json({ message: "Error al obtener el ejercicio" });
  }
};

// Crear un ejercicio en una lección
export const createExercise = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { order, title, codes, instructions, language } = req.body;

    if (!order || !title || !codes || !language || !codes.length) {
      return res.status(400).json({
        message:
          "Orden, título, al menos un código y lenguaje son obligatorios.",
      });
    }

    for (const code of codes) {
      if (!code.language || !code.initialCode) {
        return res.status(400).json({
          message: "Cada código debe tener un lenguaje y un código inicial.",
        });
      }
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada." });
    }

    const newExercise = {
      order,
      title,
      codes,
      instructions,
      language,
    };

    lesson.exercises.push(newExercise);
    await lesson.save();

    res.status(201).json({
      message: "Ejercicio creado exitosamente.",
      exercise: newExercise,
    });
  } catch (error) {
    console.error("Error en createExercise:", error);
    res
      .status(500)
      .json({ message: "Error al crear el ejercicio.", error: error.message });
  }
};

// Actualizar un ejercicio por lessonId y order
export const updateExercise = async (req, res) => {
  try {
    const { lessonId, order } = req.params;
    const { title, codes, instructions, language } = req.body;

    if (!title || !codes || !language || !codes.length) {
      return res.status(400).json({
        message: "Título, al menos un código y lenguaje son obligatorios.",
      });
    }

    for (const code of codes) {
      if (!code.language || !code.initialCode) {
        return res.status(400).json({
          message: "Cada código debe tener un lenguaje y un código inicial.",
        });
      }
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada." });
    }

    const exerciseIndex = lesson.exercises.findIndex(
      (ex) => ex.order === parseInt(order)
    );
    if (exerciseIndex === -1) {
      return res.status(404).json({ message: "Ejercicio no encontrado." });
    }

    const updatedExercise = {
      ...lesson.exercises[exerciseIndex],
      order: parseInt(order),
      title,
      codes,
      instructions,
      language,
    };

    lesson.exercises[exerciseIndex] = updatedExercise;
    lesson.markModified("exercises");
    await lesson.save();

    res.status(200).json({
      message: "Ejercicio actualizado exitosamente.",
      exercise: updatedExercise,
    });
  } catch (error) {
    console.error("Error en updateExercise:", error);
    res.status(500).json({
      message: "Error al actualizar el ejercicio.",
      error: error.message,
    });
  }
};

// Eliminar un ejercicio por lessonId y order
export const deleteExercise = async (req, res) => {
  try {
    const { lessonId, order } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    const exerciseIndex = lesson.exercises.findIndex(
      (ex) => ex.order === parseInt(order)
    );
    if (exerciseIndex === -1) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    lesson.exercises.splice(exerciseIndex, 1);
    await lesson.save();

    res.json({ message: "Ejercicio eliminado correctamente" });
  } catch (error) {
    console.error("Error en deleteExercise:", error.message);
    res.status(500).json({ message: "Error al eliminar el ejercicio" });
  }
};

// Validar el código del usuario
export const validateCode = async (req, res) => {
  try {
    const { codes, expectedCodes, language } = req.body;
    const userId = req.user.userId;

    // Verificar vidas
    const lives = await livesService.getLives(userId);
    if (lives <= 0) {
      return res.status(403).json({
        isCorrect: false,
        message:
          "No tienes vidas suficientes. Compra más en la tienda o espera a que se recarguen.",
        results: {},
      });
    }

    if (!codes || !expectedCodes || !language) {
      return res.status(400).json({
        isCorrect: false,
        message: "Códigos, salidas esperadas y lenguaje son obligatorios.",
        results: {},
      });
    }

    const results = {};
    let isCorrect = true;

    const normalizeCode = (code, lang) => {
      if (!code) return "";
      switch (lang) {
        case "css":
          try {
            const parsed = parse(code);
            return JSON.stringify(parsed.stylesheet.rules, null, 2)
              .replace(/\s+/g, " ")
              .trim()
              .toLowerCase();
          } catch {
            return code.replace(/\s+/g, " ").trim().toLowerCase();
          }
        case "html":
          return minify(code, {
            collapseWhitespace: true,
            caseSensitive: true,
          }).toLowerCase();
        case "javascript":
        case "python":
        case "sql":
        case "php":
          return code.replace(/\s+/g, " ").trim().toLowerCase();
        default:
          return code.trim();
      }
    };

    for (const lang of Object.keys(expectedCodes)) {
      const userCode = codes[lang] || "";
      const expectedCode = expectedCodes[lang] || "";

      if (!expectedCode) {
        results[lang] = {
          isCorrect: true,
          message: "No se requiere validación.",
        };
        continue;
      }

      switch (lang) {
        case "html": {
          const stripComments = (code) =>
            code.replace(/<!--[\s\S]*?-->/g, "").trim();
          const cleanUserCode = stripComments(userCode);
          const cleanExpectedCode = stripComments(expectedCode);

          const userDom = new JSDOM(cleanUserCode);
          const expectedDom = new JSDOM(cleanExpectedCode);

          const userDoc = userDom.window.document;
          const expectedDoc = expectedDom.window.document;

          if (!cleanUserCode.toLowerCase().startsWith("<!doctype html>")) {
            results[lang] = {
              isCorrect: false,
              message: "Falta el <!DOCTYPE html>",
            };
            isCorrect = false;
            break;
          }

          const userHtml = userDoc.querySelector("html");
          const userHead = userDoc.querySelector("head");
          const userBody = userDoc.querySelector("body");

          if (!userHtml || !userHead || !userBody) {
            results[lang] = {
              isCorrect: false,
              message:
                "Falta la estructura básica de HTML (<html>, <head>, <body>)",
            };
            isCorrect = false;
            break;
          }

          const expectedBody = expectedDoc.querySelector("body");
          if (!expectedBody) {
            results[lang] = {
              isCorrect: false,
              message: "La salida esperada debe tener un elemento <body>",
            };
            isCorrect = false;
            break;
          }

          const getElementStructure = (element, parentPath = "") => {
            const structure = {};
            const children = Array.from(element.children);
            children.forEach((child, index) => {
              const tagName = child.tagName.toLowerCase();
              const currentPath = parentPath
                ? `${parentPath}.${tagName}[${index}]`
                : tagName;
              structure[tagName] = (structure[tagName] || 0) + 1;
              const childStructure = getElementStructure(child, currentPath);
              for (const [childTag, count] of Object.entries(childStructure)) {
                structure[childTag] = (structure[childTag] || 0) + count;
              }
            });
            return structure;
          };

          const expectedStructure = getElementStructure(expectedBody);
          const userStructure = getElementStructure(userBody);

          for (const [tagName, expectedCount] of Object.entries(
            expectedStructure
          )) {
            const userCount = userStructure[tagName] || 0;
            if (userCount !== expectedCount) {
              results[lang] = {
                isCorrect: false,
                message: `Se esperaban exactamente ${expectedCount} elemento(s) <${tagName}>, pero se encontraron ${userCount}`,
              };
              isCorrect = false;
              break;
            }
          }

          if (isCorrect) {
            for (const [tagName, userCount] of Object.entries(userStructure)) {
              const expectedCount = expectedStructure[tagName] || 0;
              if (userCount !== expectedCount) {
                results[lang] = {
                  isCorrect: false,
                  message: `Se encontraron ${userCount} elemento(s) <${tagName}>, pero se esperaban ${expectedCount}`,
                };
                isCorrect = false;
                break;
              }
            }
          }

          const textContainingTags = [
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "p",
            "span",
            "div",
          ];
          const validateTextContent = (element, tagName, path) => {
            if (
              textContainingTags.includes(tagName) &&
              !element.textContent.trim()
            ) {
              throw new Error(
                `El elemento <${tagName}> en ${path} no puede estar vacío`
              );
            }
            Array.from(element.children).forEach((child, index) => {
              const childTag = child.tagName.toLowerCase();
              const childPath = path
                ? `${path}.${childTag}[${index}]`
                : childTag;
              validateTextContent(child, childTag, childPath);
            });
          };

          if (isCorrect) {
            try {
              validateTextContent(userBody, "body", "body");
              results[lang] = {
                isCorrect: true,
                message: "HTML correcto",
              };
            } catch (error) {
              results[lang] = {
                isCorrect: false,
                message: error.message,
              };
              isCorrect = false;
            }
          }
          break;
        }

        case "css": {
          try {
            const userParsed = parse(userCode);
            const expectedParsed = parse(expectedCode);

            const normalizeRules = (rules) => {
              return JSON.stringify(rules, (key, value) => {
                if (key === "position" || key === "type") return undefined;
                if (typeof value === "string")
                  return value.trim().toLowerCase();
                return value;
              })
                .replace(/\s+/g, " ")
                .trim();
            };

            const userRules = normalizeRules(userParsed.stylesheet.rules);
            const expectedRules = normalizeRules(
              expectedParsed.stylesheet.rules
            );

            const cssIsCorrect = userRules === expectedRules;
            results[lang] = {
              isCorrect: cssIsCorrect,
              message: cssIsCorrect
                ? "CSS correcto"
                : "Las reglas CSS no coinciden con las esperadas",
            };
            if (!cssIsCorrect) isCorrect = false;
          } catch (error) {
            results[lang] = {
              isCorrect: false,
              message: `Error al parsear CSS: ${error.message}`,
            };
            isCorrect = false;
          }
          break;
        }

        case "javascript": {
          const vm = new VM({
            timeout: 1000,
            sandbox: {},
          });

          let userResult, expectedResult;
          try {
            userResult = vm.run(userCode);
            expectedResult = vm.run(expectedCode);
            const isEqual =
              JSON.stringify(userResult) === JSON.stringify(expectedResult);
            results[lang] = {
              isCorrect: isEqual,
              message: isEqual
                ? "JavaScript correcto"
                : "El resultado no coincide con lo esperado",
            };
            if (!isEqual) isCorrect = false;
          } catch (error) {
            results[lang] = {
              isCorrect: false,
              message: `Error en JavaScript: ${error.message}`,
            };
            isCorrect = false;
          }
          break;
        }

        case "python": {
          const normalizedUserCode = normalizeCode(userCode, "python");
          const normalizedExpectedCode = normalizeCode(expectedCode, "python");
          const isEqual = normalizedUserCode === normalizedExpectedCode;
          results[lang] = {
            isCorrect: isEqual,
            message: isEqual
              ? "Python correcto"
              : "El código Python no coincide con lo esperado",
          };
          if (!isEqual) isCorrect = false;
          break;
        }

        case "sql": {
          const db = new sqlite3.Database(":memory:");
          const runQuery = util.promisify(db.run.bind(db));
          const allQuery = util.promisify(db.all.bind(db));

          try {
            await runQuery(`
              CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                name TEXT,
                age INTEGER
              );
              INSERT INTO users (name, age) VALUES ('Alice', 25), ('Bob', 30);
            `);

            let userRows, expectedRows;
            try {
              userRows = await allQuery(userCode);
            } catch (error) {
              results[lang] = {
                isCorrect: false,
                message: `Error en SQL: ${error.message}`,
              };
              isCorrect = false;
              break;
            }

            try {
              expectedRows = await allQuery(expectedCode);
            } catch (error) {
              results[lang] = {
                isCorrect: false,
                message: `Error en la salida esperada SQL: ${error.message}`,
              };
              isCorrect = false;
              break;
            }

            const isEqual =
              JSON.stringify(userRows) === JSON.stringify(expectedRows);
            results[lang] = {
              isCorrect: isEqual,
              message: isEqual
                ? "SQL correcto"
                : "El resultado de la consulta no coincide",
            };
            if (!isEqual) isCorrect = false;

            db.close();
          } catch (error) {
            results[lang] = {
              isCorrect: false,
              message: `Error al ejecutar SQL: ${error.message}`,
            };
            isCorrect = false;
            db.close();
          }
          break;
        }

        case "php": {
          const userFile = `/tmp/user_${Date.now()}.php`;
          const expectedFile = `/tmp/expected_${Date.now()}.php`;
          require("fs").writeFileSync(userFile, `<?php ${userCode} ?>`);
          require("fs").writeFileSync(expectedFile, `<?php ${expectedCode} ?>`);

          try {
            const { stdout: userOutput } = await execPromise(`php ${userFile}`);
            const { stdout: expectedOutput } = await execPromise(
              `php ${expectedFile}`
            );
            const isEqual = userOutput.trim() === expectedOutput.trim();
            results[lang] = {
              isCorrect: isEqual,
              message: isEqual
                ? "PHP correcto"
                : "La salida PHP no coincide con lo esperado",
            };
            if (!isEqual) isCorrect = false;
          } catch (error) {
            results[lang] = {
              isCorrect: false,
              message: `Error en PHP: ${error.message}`,
            };
            isCorrect = false;
          } finally {
            require("fs").unlinkSync(userFile);
            require("fs").unlinkSync(expectedFile);
          }
          break;
        }

        default: {
          const normalizedUserCode = normalizeCode(userCode, lang);
          const normalizedExpectedCode = normalizeCode(expectedCode, lang);
          const isEqual = normalizedUserCode === normalizedExpectedCode;
          results[lang] = {
            isCorrect: isEqual,
            message: isEqual
              ? `${lang} correcto`
              : `El código ${lang} продукти не відповідає очікуванням`,
          };
          if (!isEqual) isCorrect = false;
        }
      }
    }

    if (!isCorrect) {
      const remainingLives = await livesService.deductLife(userId);
      return res.status(200).json({
        isCorrect: false,
        message: `Código incorrecto. Vidas restantes: ${remainingLives}`,
        results,
        lives: remainingLives,
      });
    }

    res.json({
      isCorrect,
      results,
      message: "Todos los códigos son correctos",
    });
  } catch (error) {
    console.error("Error en validateCode:", error);
    res.status(500).json({
      isCorrect: false,
      message: `Error al validar: ${error.message}`,
      results: {},
    });
  }
};

// Obtener todo el progreso por curso
export const getAllProgressByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID de curso inválido" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    const progress = await UserExerciseProgress.find({
      userId,
      courseId,
    }).lean();

    if (!progress || progress.length === 0) {
      return res.status(200).json([]);
    }

    const progressData = progress.map((exercise) => ({
      userId: userId,
      courseId: courseId,
      lessonId: exercise.lessonId.toString(),
      exerciseOrder: exercise.exerciseOrder,
      completed: exercise.completed,
      completedAt: exercise.completedAt,
    }));

    res.status(200).json(progressData);
  } catch (error) {
    console.error("Error en getAllProgressByCourse:", error.message);
    res.status(500).json({ message: "Error al obtener el progreso" });
  }
};
