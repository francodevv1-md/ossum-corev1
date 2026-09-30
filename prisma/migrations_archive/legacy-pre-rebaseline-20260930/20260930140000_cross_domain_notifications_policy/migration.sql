-- AlterEnum
ALTER TYPE "InternalNotificationType" ADD VALUE 'surgery_critical_change';
ALTER TYPE "InternalNotificationType" ADD VALUE 'surgery_reassigned';
ALTER TYPE "InternalNotificationType" ADD VALUE 'surgery_date_assigned';
ALTER TYPE "InternalNotificationType" ADD VALUE 'surgery_authorized';
ALTER TYPE "InternalNotificationType" ADD VALUE 'surgery_blocked';
ALTER TYPE "InternalNotificationType" ADD VALUE 'remito_prepared';
ALTER TYPE "InternalNotificationType" ADD VALUE 'remito_dispatched';
ALTER TYPE "InternalNotificationType" ADD VALUE 'remito_delivered';
ALTER TYPE "InternalNotificationType" ADD VALUE 'logistics_incident';
ALTER TYPE "InternalNotificationType" ADD VALUE 'stock_receipt_confirmed';
ALTER TYPE "InternalNotificationType" ADD VALUE 'stock_low';
ALTER TYPE "InternalNotificationType" ADD VALUE 'stock_expiry';
ALTER TYPE "InternalNotificationType" ADD VALUE 'stock_difference';
ALTER TYPE "InternalNotificationType" ADD VALUE 'consumo_pending_validation';
ALTER TYPE "InternalNotificationType" ADD VALUE 'consumo_validated';
ALTER TYPE "InternalNotificationType" ADD VALUE 'devolucion_confirmed';
ALTER TYPE "InternalNotificationType" ADD VALUE 'consumo_incident';
ALTER TYPE "InternalNotificationType" ADD VALUE 'comparativa_deviation';
ALTER TYPE "InternalNotificationType" ADD VALUE 'comparativa_pending_review';
ALTER TYPE "InternalNotificationType" ADD VALUE 'payment_recorded';
ALTER TYPE "InternalNotificationType" ADD VALUE 'payment_cancelled';
ALTER TYPE "InternalNotificationType" ADD VALUE 'invoice_due';

-- AlterTable
ALTER TABLE "InternalNotification" 
  ALTER COLUMN "surgeryId" DROP NOT NULL,
  ADD COLUMN "domain" TEXT NOT NULL DEFAULT 'CIRUGIAS',
  ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'INFO',
  ADD COLUMN "linkHref" TEXT;

-- CreateTable
CREATE TABLE "NotificationRolePolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "notificationType" "InternalNotificationType" NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRolePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationUserPreference" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" "InternalNotificationType" NOT NULL,
    "inAppMuted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationUserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalNotification_companyId_domain_recipientUserId_readA_idx" ON "InternalNotification"("companyId", "domain", "recipientUserId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRolePolicy_companyId_role_notificationType_key" ON "NotificationRolePolicy"("companyId", "role", "notificationType");

-- CreateIndex
CREATE INDEX "NotificationRolePolicy_companyId_role_idx" ON "NotificationRolePolicy"("companyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationUserPreference_companyId_userId_notificationTyp_key" ON "NotificationUserPreference"("companyId", "userId", "notificationType");

-- CreateIndex
CREATE INDEX "NotificationUserPreference_companyId_userId_idx" ON "NotificationUserPreference"("companyId", "userId");

-- AddForeignKey
ALTER TABLE "NotificationRolePolicy" ADD CONSTRAINT "NotificationRolePolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationUserPreference" ADD CONSTRAINT "NotificationUserPreference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationUserPreference" ADD CONSTRAINT "NotificationUserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
