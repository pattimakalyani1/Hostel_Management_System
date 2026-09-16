-- AlterTable
ALTER TABLE "Bed" ADD COLUMN     "maintenanceDate" TIMESTAMP(3),
ADD COLUMN     "maintenanceReason" TEXT;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "description" TEXT,
ADD COLUMN     "sharingType" INTEGER NOT NULL DEFAULT 4;
