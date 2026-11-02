-- Para quién es cada curso: niños o jóvenes y adultos (los de antes, adultos).
CREATE TYPE "CourseAudience" AS ENUM ('KIDS', 'ADULTS');
ALTER TABLE "Course" ADD COLUMN "audience" "CourseAudience" NOT NULL DEFAULT 'ADULTS';
