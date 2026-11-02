-- Se deja de separar cursos para niños y para adultos: todo es para los dos
-- públicos (los niños no usan la web solos y separar bajaba la retención).
ALTER TABLE "Course" DROP COLUMN IF EXISTS "audience";
DROP TYPE IF EXISTS "CourseAudience";
