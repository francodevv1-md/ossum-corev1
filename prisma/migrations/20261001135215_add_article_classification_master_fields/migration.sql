-- AlterTable
ALTER TABLE "article" ADD COLUMN     "category" TEXT,
ADD COLUMN     "isSterile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pmAnmat" TEXT;
