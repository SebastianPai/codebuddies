import Lesson from "../models/LessonModel.js";
import Course from "../models/CourseModel.js";
import * as progressService from "../services/progressService.js";
import * as livesService from "../services/livesService.js"; // Para el sistema de vidas
import User from "../models/User.js";
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
        userProgress: { lives },
      });
    }

    if (!codes || !expectedCodes || !language) {
      return res.status(400).json({
        isCorrect: false,
        message: "Códigos, salidas esperadas y lenguaje son obligatorios.",
        results: {},
        userProgress: { lives },
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
        case "typescript":
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
          feedback: [],
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

          // Validar estructura básica
          if (!cleanUserCode.toLowerCase().startsWith("<!doctype html>")) {
            results[lang] = {
              isCorrect: false,
              message: "Falta el <!DOCTYPE html> al inicio del documento.",
              feedback: [
                "Agrega `<!DOCTYPE html>` como primera línea de tu código.",
              ],
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
                "Falta la estructura básica de HTML (<html>, <head>, <body>).",
              feedback: [
                "Asegúrate de incluir las etiquetas `<html>`, `<head>` y `<body>` en tu código.",
              ],
            };
            isCorrect = false;
            break;
          }

          const expectedBody = expectedDoc.querySelector("body");
          if (!expectedBody) {
            results[lang] = {
              isCorrect: false,
              message: "La salida esperada debe tener un elemento <body>.",
              feedback: ["El código esperado debe incluir un `<body>` válido."],
            };
            isCorrect = false;
            break;
          }

          // Comparar estructuras DOM
          const compareDOMStructures = (
            userElement,
            expectedElement,
            path = "body"
          ) => {
            const feedback = [];

            // Comparar nombre de la etiqueta
            if (
              userElement.tagName.toLowerCase() !==
              expectedElement.tagName.toLowerCase()
            ) {
              feedback.push(
                `En ${path}: Se esperaba un elemento <${expectedElement.tagName.toLowerCase()}> pero se encontró <${userElement.tagName.toLowerCase()}>.`
              );
              return { isCorrect: false, feedback };
            }

            // Comparar atributos
            const userAttrs = Array.from(userElement.attributes).reduce(
              (acc, attr) => ({ ...acc, [attr.name]: attr.value }),
              {}
            );
            const expectedAttrs = Array.from(expectedElement.attributes).reduce(
              (acc, attr) => ({ ...acc, [attr.name]: attr.value }),
              {}
            );

            for (const [attr, value] of Object.entries(expectedAttrs)) {
              if (!userAttrs[attr]) {
                feedback.push(
                  `En ${path}: Falta el atributo ${attr}="${value}" en <${userElement.tagName.toLowerCase()}>.`
                );
              } else if (userAttrs[attr] !== value) {
                feedback.push(
                  `En ${path}: El atributo ${attr} debería ser "${value}" pero es "${userAttrs[attr]}".`
                );
              }
            }
            for (const attr of Object.keys(userAttrs)) {
              if (!expectedAttrs[attr]) {
                feedback.push(
                  `En ${path}: El atributo ${attr}="${
                    userAttrs[attr]
                  }" no se esperaba en <${userElement.tagName.toLowerCase()}>.`
                );
              }
            }

            // Comparar contenido de texto
            const textContainingTags = [
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6",
              "p",
              "span",
            ];
            if (
              textContainingTags.includes(userElement.tagName.toLowerCase())
            ) {
              const userText = userElement.textContent.trim();
              const expectedText = expectedElement.textContent.trim();
              if (userText !== expectedText) {
                feedback.push(
                  `En ${path}: El texto en <${userElement.tagName.toLowerCase()}> debería ser "${expectedText}" pero es "${
                    userText || "(vacío)"
                  }".`
                );
              }
            }

            // Comparar hijos
            const userChildren = Array.from(userElement.children);
            const expectedChildren = Array.from(expectedElement.children);

            if (userChildren.length < expectedChildren.length) {
              feedback.push(
                `En ${path}: Faltan elementos hijos en <${userElement.tagName.toLowerCase()}>. Se esperaban ${
                  expectedChildren.length
                } pero se encontraron ${userChildren.length}.`
              );
            } else if (userChildren.length > expectedChildren.length) {
              feedback.push(
                `En ${path}: Hay elementos hijos de más en <${userElement.tagName.toLowerCase()}>. Se esperaban ${
                  expectedChildren.length
                } pero se encontraron ${userChildren.length}.`
              );
            }

            // Comparar cada hijo
            const maxLength = Math.max(
              userChildren.length,
              expectedChildren.length
            );
            for (let i = 0; i < maxLength; i++) {
              if (i >= userChildren.length) {
                feedback.push(
                  `En ${path}: Falta un elemento <${expectedChildren[
                    i
                  ].tagName.toLowerCase()}> en la posición ${i + 1}.`
                );
              } else if (i >= expectedChildren.length) {
                feedback.push(
                  `En ${path}: El elemento <${userChildren[
                    i
                  ].tagName.toLowerCase()}> en la posición ${
                    i + 1
                  } no se esperaba.`
                );
              } else {
                const childPath = `${path}.${userChildren[
                  i
                ].tagName.toLowerCase()}[${i}]`;
                const childComparison = compareDOMStructures(
                  userChildren[i],
                  expectedChildren[i],
                  childPath
                );
                feedback.push(...childComparison.feedback);
                if (!childComparison.isCorrect) isCorrect = false;
              }
            }

            return { isCorrect: feedback.length === 0, feedback };
          };

          const comparison = compareDOMStructures(userBody, expectedBody);
          results[lang] = {
            isCorrect: comparison.isCorrect,
            message: comparison.isCorrect
              ? "HTML correcto"
              : "La estructura HTML no coincide con la esperada.",
            feedback: comparison.feedback,
          };
          if (!comparison.isCorrect) isCorrect = false;
          break;
        }

        case "css": {
          try {
            const userParsed = parse(userCode);
            const expectedParsed = parse(expectedCode);

            const feedback = [];

            const userRules = userParsed.stylesheet.rules;
            const expectedRules = expectedParsed.stylesheet.rules;

            // Comparar número de reglas
            if (userRules.length !== expectedRules.length) {
              feedback.push(
                `Se esperaban ${expectedRules.length} reglas CSS, pero se encontraron ${userRules.length}.`
              );
            }

            // Comparar cada regla
            expectedRules.forEach((expectedRule, i) => {
              const userRule = userRules[i];
              if (!userRule) {
                feedback.push(
                  `Falta la regla CSS para el selector "${expectedRule.selectors.join(
                    ", "
                  )}".`
                );
                return;
              }

              // Comparar selectores
              if (
                userRule.selectors.join(", ") !==
                expectedRule.selectors.join(", ")
              ) {
                feedback.push(
                  `El selector "${userRule.selectors.join(
                    ", "
                  )}" no coincide con el esperado "${expectedRule.selectors.join(
                    ", "
                  )}".`
                );
              }

              // Comparar declaraciones
              const expectedDeclarations = expectedRule.declarations.reduce(
                (acc, d) => ({ ...acc, [d.property]: d.value }),
                {}
              );
              const userDeclarations = userRule.declarations.reduce(
                (acc, d) => ({ ...acc, [d.property]: d.value }),
                {}
              );

              for (const [prop, value] of Object.entries(
                expectedDeclarations
              )) {
                if (!userDeclarations[prop]) {
                  feedback.push(
                    `Falta la propiedad CSS "${prop}: ${value}" en la regla "${expectedRule.selectors.join(
                      ", "
                    )}".`
                  );
                } else if (userDeclarations[prop] !== value) {
                  feedback.push(
                    `La propiedad "${prop}" en "${expectedRule.selectors.join(
                      ", "
                    )}" debería ser "${value}" pero es "${
                      userDeclarations[prop]
                    }".`
                  );
                }
              }

              for (const prop of Object.keys(userDeclarations)) {
                if (!expectedDeclarations[prop]) {
                  feedback.push(
                    `La propiedad "${prop}: ${
                      userDeclarations[prop]
                    }" en "${userRule.selectors.join(", ")}" no se esperaba.`
                  );
                }
              }
            });

            // Verificar reglas adicionales
            userRules.slice(expectedRules.length).forEach((extraRule) => {
              feedback.push(
                `La regla CSS para el selector "${extraRule.selectors.join(
                  ", "
                )}" no se esperaba.`
              );
            });

            const cssIsCorrect = feedback.length === 0;
            results[lang] = {
              isCorrect: cssIsCorrect,
              message: cssIsCorrect
                ? "CSS correcto"
                : "Las reglas CSS no coinciden con las esperadas.",
              feedback,
            };
            if (!cssIsCorrect) isCorrect = false;
          } catch (error) {
            results[lang] = {
              isCorrect: false,
              message: `Error al parsear CSS: ${error.message}`,
              feedback: [
                "Revisa la sintaxis de tu CSS, parece haber un error.",
              ],
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

          const feedback = [];

          let userResult, expectedResult;
          try {
            userResult = vm.run(userCode);
            expectedResult = vm.run(expectedCode);

            const isEqual =
              JSON.stringify(userResult) === JSON.stringify(expectedResult);
            if (!isEqual) {
              feedback.push(
                `El resultado de tu código (${JSON.stringify(
                  userResult
                )}) no coincide con el esperado (${JSON.stringify(
                  expectedResult
                )}).`
              );
              // Intentar identificar diferencias específicas
              if (Array.isArray(userResult) && Array.isArray(expectedResult)) {
                if (userResult.length !== expectedResult.length) {
                  feedback.push(
                    `El arreglo debe tener ${expectedResult.length} elementos, pero tiene ${userResult.length}.`
                  );
                } else {
                  userResult.forEach((item, i) => {
                    if (
                      JSON.stringify(item) !== JSON.stringify(expectedResult[i])
                    ) {
                      feedback.push(
                        `El elemento en la posición ${i} debería ser ${JSON.stringify(
                          expectedResult[i]
                        )} pero es ${JSON.stringify(item)}.`
                      );
                    }
                  });
                }
              } else if (
                typeof userResult === "object" &&
                typeof expectedResult === "object"
              ) {
                for (const key of Object.keys(expectedResult)) {
                  if (!(key in userResult)) {
                    feedback.push(
                      `Falta la propiedad "${key}" en el objeto resultado.`
                    );
                  } else if (
                    JSON.stringify(userResult[key]) !==
                    JSON.stringify(expectedResult[key])
                  ) {
                    feedback.push(
                      `La propiedad "${key}" debería ser ${JSON.stringify(
                        expectedResult[key]
                      )} pero es ${JSON.stringify(userResult[key])}.`
                    );
                  }
                }
                for (const key of Object.keys(userResult)) {
                  if (!(key in expectedResult)) {
                    feedback.push(
                      `La propiedad "${key}" no se esperaba en el objeto resultado.`
                    );
                  }
                }
              }
            }

            results[lang] = {
              isCorrect: isEqual,
              message: isEqual
                ? "JavaScript correcto"
                : "El resultado no coincide con lo esperado.",
              feedback,
            };
            if (!isEqual) isCorrect = false;
          } catch (error) {
            feedback.push(`Error en tu código JavaScript: ${error.message}`);
            results[lang] = {
              isCorrect: false,
              message: `Error en JavaScript: ${error.message}`,
              feedback,
            };
            isCorrect = false;
          }
          break;
        }

        case "typescript": {
          const vm = new VM({
            timeout: 1000,
            sandbox: {},
          });

          const feedback = [];

          try {
            // Simular validación de TypeScript (sin compilación real)
            // Asumimos que el código TypeScript es JavaScript válido para ejecución
            const userResult = vm.run(userCode);
            const expectedResult = vm.run(expectedCode);

            const isEqual =
              JSON.stringify(userResult) === JSON.stringify(expectedResult);
            if (!isEqual) {
              feedback.push(
                `El resultado de tu código (${JSON.stringify(
                  userResult
                )}) no coincide con el esperado (${JSON.stringify(
                  expectedResult
                )}).`
              );
              // Validación básica de tipos (simulada)
              // Nota: Para una validación real de TypeScript, necesitarías integrar el compilador de TypeScript (tsc)
              if (typeof userResult !== typeof expectedResult) {
                feedback.push(
                  `El tipo del resultado debería ser ${typeof expectedResult} pero es ${typeof userResult}.`
                );
              }
              // Comparar estructuras como en JavaScript
              if (Array.isArray(userResult) && Array.isArray(expectedResult)) {
                if (userResult.length !== expectedResult.length) {
                  feedback.push(
                    `El arreglo debe tener ${expectedResult.length} elementos, pero tiene ${userResult.length}.`
                  );
                }
              } else if (
                typeof userResult === "object" &&
                typeof expectedResult === "object"
              ) {
                for (const key of Object.keys(expectedResult)) {
                  if (!(key in userResult)) {
                    feedback.push(
                      `Falta la propiedad "${key}" en el objeto resultado.`
                    );
                  } else if (
                    JSON.stringify(userResult[key]) !==
                    JSON.stringify(expectedResult[key])
                  ) {
                    feedback.push(
                      `La propiedad "${key}" debería ser ${JSON.stringify(
                        expectedResult[key]
                      )} pero es ${JSON.stringify(userResult[key])}.`
                    );
                  }
                }
              }
            }

            results[lang] = {
              isCorrect: isEqual,
              message: isEqual
                ? "TypeScript correcto"
                : "El resultado no coincide con lo esperado.",
              feedback,
            };
            if (!isEqual) isCorrect = false;
          } catch (error) {
            feedback.push(`Error en tu código TypeScript: ${error.message}`);
            // Simular errores de tipo (esto es básico, puedes mejorar con tsc)
            if (error.message.includes("is not defined")) {
              feedback.push(
                "Parece que una variable o función no está definida. Revisa tus declaraciones."
              );
            }
            results[lang] = {
              isCorrect: false,
              message: `Error en TypeScript: ${error.message}`,
              feedback,
            };
            isCorrect = false;
          }
          break;
        }

        case "sql": {
          const db = new sqlite3.Database(":memory:");
          const runQuery = util.promisify(db.run.bind(db));
          const allQuery = util.promisify(db.all.bind(db));

          const feedback = [];

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
              feedback.push(`Error en tu consulta SQL: ${error.message}`);
              if (error.message.includes("no such table")) {
                feedback.push(
                  "La tabla especificada no existe. Asegúrate de usar la tabla 'users'."
                );
              } else if (error.message.includes("syntax error")) {
                feedback.push(
                  "Hay un error de sintaxis en tu consulta. Revisa los comandos SQL."
                );
              }
              results[lang] = {
                isCorrect: false,
                message: `Error en SQL: ${error.message}`,
                feedback,
              };
              isCorrect = false;
              break;
            }

            try {
              expectedRows = await allQuery(expectedCode);
            } catch (error) {
              feedback.push(`Error en la consulta esperada: ${error.message}`);
              results[lang] = {
                isCorrect: false,
                message: `Error en la salida esperada SQL: ${error.message}`,
                feedback,
              };
              isCorrect = false;
              break;
            }

            const isEqual =
              JSON.stringify(userRows) === JSON.stringify(expectedRows);
            if (!isEqual) {
              feedback.push(
                `El resultado de tu consulta (${JSON.stringify(
                  userRows
                )}) no coincide con el esperado (${JSON.stringify(
                  expectedRows
                )}).`
              );
              if (userRows.length !== expectedRows.length) {
                feedback.push(
                  `La consulta debe devolver ${expectedRows.length} filas, pero devuelve ${userRows.length}.`
                );
              } else {
                userRows.forEach((row, i) => {
                  if (JSON.stringify(row) !== JSON.stringify(expectedRows[i])) {
                    feedback.push(
                      `La fila ${i + 1} debería ser ${JSON.stringify(
                        expectedRows[i]
                      )} pero es ${JSON.stringify(row)}.`
                    );
                  }
                });
              }
            }

            results[lang] = {
              isCorrect: isEqual,
              message: isEqual
                ? "SQL correcto"
                : "El resultado de la consulta no coincide.",
              feedback,
            };
            if (!isEqual) isCorrect = false;

            db.close();
          } catch (error) {
            feedback.push(`Error al ejecutar SQL: ${error.message}`);
            results[lang] = {
              isCorrect: false,
              message: `Error al ejecutar SQL: ${error.message}`,
              feedback,
            };
            isCorrect = false;
            db.close();
          }
          break;
        }

        // Mantener otros casos (python, php, etc.) sin cambios por ahora
        case "python": {
          const normalizedUserCode = normalizeCode(userCode, "python");
          const normalizedExpectedCode = normalizeCode(expectedCode, "python");
          const isEqual = normalizedUserCode === normalizedExpectedCode;
          results[lang] = {
            isCorrect: isEqual,
            message: isEqual
              ? "Python correcto"
              : "El código Python no coincide con lo esperado.",
            feedback: isEqual
              ? []
              : [
                  "El código Python no coincide con lo esperado. Revisa las instrucciones y compara tu código con el resultado esperado.",
                ],
          };
          if (!isEqual) isCorrect = false;
          break;
        }

        case "php": {
          const userFile = `/tmp/user_${Date.now()}.php`;
          const expectedFile = `/tmp/expected_${Date.now()}.php`;
          require("fs").writeFileSync(userFile, `<?php ${userCode} ?>`);
          require("fs").writeFileSync(expectedFile, `<?php ${expectedCode} ?>`);

          const feedback = [];

          try {
            const { stdout: userOutput } = await execPromise(`php ${userFile}`);
            const { stdout: expectedOutput } = await execPromise(
              `php ${expectedFile}`
            );
            const isEqual = userOutput.trim() === expectedOutput.trim();
            if (!isEqual) {
              feedback.push(
                `La salida de tu código PHP (${userOutput.trim()}) no coincide con la esperada (${expectedOutput.trim()}).`
              );
            }
            results[lang] = {
              isCorrect: isEqual,
              message: isEqual
                ? "PHP correcto"
                : "La salida PHP no coincide con lo esperado.",
              feedback,
            };
            if (!isEqual) isCorrect = false;
          } catch (error) {
            feedback.push(`Error en tu código PHP: ${error.message}`);
            results[lang] = {
              isCorrect: false,
              message: `Error en PHP: ${error.message}`,
              feedback,
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
              : `El código ${lang} no coincide con lo esperado.`,
            feedback: isEqual
              ? []
              : [
                  `El código ${lang} no coincide con lo esperado. Revisa las instrucciones.`,
                ],
          };
          if (!isEqual) isCorrect = false;
        }
      }
    }

    const user = await User.findById(userId);

    if (!isCorrect) {
      let remainingLives;
      try {
        remainingLives = await livesService.deductLife(userId);
      } catch (error) {
        console.error("Error al deducir vida:", error);
        return res.status(500).json({
          isCorrect: false,
          message: `Error al procesar la vida: ${error.message}`,
          results,
          userProgress: {
            xp: user.xp,
            level: user.level,
            maxXp: user.maxXp,
            coins: user.coins,
            streak: user.streak,
            lives: user.lives,
          },
        });
      }

      return res.status(200).json({
        isCorrect: false,
        message: `Código incorrecto. Vidas restantes: ${remainingLives}`,
        results,
        userProgress: {
          xp: user.xp,
          level: user.level,
          maxXp: user.maxXp,
          coins: user.coins,
          streak: user.streak,
          lives: remainingLives,
        },
      });
    }

    res.json({
      isCorrect: true,
      results,
      message: "Todos los códigos son correctos",
      userProgress: {
        xp: user.xp,
        level: user.level,
        maxXp: user.maxXp,
        coins: user.coins,
        streak: user.streak,
        lives: user.lives,
      },
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
