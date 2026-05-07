-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('stock', 'price', 'order', 'full');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('ok', 'warning', 'error');

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "productsAffected" INTEGER,
    "details" JSONB,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_snapshots" (
    "id" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productCode" TEXT NOT NULL,
    "stockTn" INTEGER NOT NULL,
    "stockFx" INTEGER NOT NULL,
    "diff" INTEGER NOT NULL,

    CONSTRAINT "stock_snapshots_pkey" PRIMARY KEY ("id")
);
