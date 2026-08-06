-- CreateEnum
CREATE TYPE "ProjectSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED');

-- CreateTable
CREATE TABLE "CourseProject" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseProjectSubmission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submissionUrl" TEXT,
    "submissionText" TEXT,
    "status" "ProjectSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "CourseProjectSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseProject_courseId_key" ON "CourseProject"("courseId");

-- CreateIndex
CREATE INDEX "CourseProjectSubmission_projectId_status_idx" ON "CourseProjectSubmission"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CourseProjectSubmission_projectId_userId_key" ON "CourseProjectSubmission"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "CourseProject" ADD CONSTRAINT "CourseProject_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseProjectSubmission" ADD CONSTRAINT "CourseProjectSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CourseProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseProjectSubmission" ADD CONSTRAINT "CourseProjectSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
