-- CreateEnum
CREATE TYPE "AcademyType" AS ENUM ('CODEBUDDIES', 'UNIVERSITY', 'COMPANY', 'PARTNER');

-- CreateEnum
CREATE TYPE "CertificateOrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CertificateAccessType" AS ENUM ('FREE', 'PAID', 'PREMIUM', 'INSTITUTIONAL', 'SCHOLARSHIP');

-- CreateEnum
CREATE TYPE "PaymentProviderType" AS ENUM ('MOCK', 'STRIPE', 'PAYPAL');

-- CreateEnum
CREATE TYPE "SubscriptionProviderType" AS ENUM ('MOCK', 'STRIPE', 'PAYPAL');

-- CreateEnum
CREATE TYPE "PremiumSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Academy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "AcademyType" NOT NULL DEFAULT 'CODEBUDDIES',
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Academy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "academyId" TEXT,
    "verificationCode" TEXT NOT NULL,
    "verificationUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "academyId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "CertificateOrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentProvider" "PaymentProviderType" NOT NULL DEFAULT 'MOCK',
    "providerPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "CertificateOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "academyId" TEXT,
    "accessType" "CertificateAccessType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "CertificateAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremiumSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "SubscriptionProviderType" NOT NULL DEFAULT 'MOCK',
    "providerSubscriptionId" TEXT,
    "status" "PremiumSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremiumSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Academy_slug_key" ON "Academy"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationCode_key" ON "Certificate"("verificationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_courseId_key" ON "Certificate"("userId", "courseId");

-- CreateIndex
CREATE INDEX "Certificate_academyId_idx" ON "Certificate"("academyId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateOrder_providerPaymentId_key" ON "CertificateOrder"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateOrder_userId_courseId_key" ON "CertificateOrder"("userId", "courseId");

-- CreateIndex
CREATE INDEX "CertificateOrder_academyId_idx" ON "CertificateOrder"("academyId");

-- CreateIndex
CREATE INDEX "CertificateOrder_status_idx" ON "CertificateOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateAccess_userId_courseId_accessType_key" ON "CertificateAccess"("userId", "courseId", "accessType");

-- CreateIndex
CREATE INDEX "CertificateAccess_academyId_idx" ON "CertificateAccess"("academyId");

-- CreateIndex
CREATE INDEX "CertificateAccess_accessType_idx" ON "CertificateAccess"("accessType");

-- CreateIndex
CREATE UNIQUE INDEX "PremiumSubscription_providerSubscriptionId_key" ON "PremiumSubscription"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "PremiumSubscription_userId_status_idx" ON "PremiumSubscription"("userId", "status");

-- CreateIndex
CREATE INDEX "PremiumSubscription_expiresAt_idx" ON "PremiumSubscription"("expiresAt");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateOrder" ADD CONSTRAINT "CertificateOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateOrder" ADD CONSTRAINT "CertificateOrder_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateOrder" ADD CONSTRAINT "CertificateOrder_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateAccess" ADD CONSTRAINT "CertificateAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateAccess" ADD CONSTRAINT "CertificateAccess_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateAccess" ADD CONSTRAINT "CertificateAccess_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumSubscription" ADD CONSTRAINT "PremiumSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
