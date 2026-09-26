-- Quiz: cada intento guarda qué pregunta respondió, para completar el
-- ejercicio solo cuando todas las preguntas se respondieron bien.
ALTER TABLE "ExerciseAttempt" ADD COLUMN "questionIndex" INTEGER;
