-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('DEMO');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderPurpose" AS ENUM ('OPEN', 'CLOSE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'EXECUTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PositionDirection" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('OPEN', 'CLOSE_PENDING', 'CLOSED');

-- CreateEnum
CREATE TYPE "LedgerBucket" AS ENUM ('AVAILABLE', 'LOCKED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('INITIAL_FUNDING', 'RESERVE', 'RELEASE', 'REALIZED_PNL');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('OPEN_POSITION', 'CLOSE_POSITION');

-- CreateEnum
CREATE TYPE "CommandOutcome" AS ENUM ('EXECUTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OutboxDestination" AS ENUM ('ORDER_COMMANDS', 'TRADE_EVENTS');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'DEAD_LETTER');

-- DropIndex
DROP INDEX IF EXISTS "market_candles_start_time_idx";

-- DropIndex
DROP INDEX IF EXISTS "market_quotes_received_at_idx";

-- AlterTable
ALTER TABLE "market_candles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "market_quotes"
ALTER COLUMN "ingest_id"
SET DEFAULT nextval('public.market_quotes_ingest_id_seq'::regclass);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'DEMO',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "availableBalance" BIGINT NOT NULL DEFAULT 0,
    "lockedBalance" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "purpose" "OrderPurpose" NOT NULL,
    "quantity" BIGINT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "positionId" TEXT,
    "executionPrice" BIGINT,
    "idempotencyKey" TEXT,
    "rejectionReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "direction" "PositionDirection" NOT NULL,
    "quantity" BIGINT NOT NULL,
    "entryPrice" BIGINT NOT NULL,
    "exitPrice" BIGINT,
    "reservedAmount" BIGINT NOT NULL,
    "realizedPnl" BIGINT,
    "status" "PositionStatus" NOT NULL DEFAULT 'OPEN',
    "openOrderId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "operationId" UUID NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "bucket" "LedgerBucket" NOT NULL,
    "amount" BIGINT NOT NULL,
    "referenceId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedCommand" (
    "commandId" TEXT NOT NULL,
    "commandType" "CommandType" NOT NULL,
    "outcome" "CommandOutcome" NOT NULL,
    "aggregateId" TEXT,
    "result" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedCommand_pkey" PRIMARY KEY ("commandId")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "destination" "OutboxDestination" NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_accountType_currency_key" ON "Account"("userId", "accountType", "currency");

-- CreateIndex
CREATE INDEX "Order_accountId_status_createdAt_idx" ON "Order"("accountId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_accountId_idempotencyKey_key" ON "Order"("accountId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_accountId_id_key" ON "Order"("accountId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Position_openOrderId_key" ON "Position"("openOrderId");

-- CreateIndex
CREATE INDEX "Position_accountId_status_openedAt_idx" ON "Position"("accountId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "Position_asset_status_idx" ON "Position"("asset", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Position_accountId_id_key" ON "Position"("accountId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Position_accountId_openOrderId_key" ON "Position"("accountId", "openOrderId");

-- CreateIndex
CREATE INDEX "LedgerEntry_accountId_createdAt_idx" ON "LedgerEntry"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_operationId_idx" ON "LedgerEntry"("operationId");

-- CreateIndex
CREATE INDEX "LedgerEntry_referenceId_idx" ON "LedgerEntry"("referenceId");

-- CreateIndex
CREATE INDEX "ProcessedCommand_commandType_processedAt_idx" ON "ProcessedCommand"("commandType", "processedAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_createdAt_idx" ON "OutboxEvent"("status", "availableAt", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_destination_status_availableAt_idx" ON "OutboxEvent"("destination", "status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateId_idx" ON "OutboxEvent"("aggregateId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_accountId_positionId_fkey" FOREIGN KEY ("accountId", "positionId") REFERENCES "Position"("accountId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Position" ADD CONSTRAINT "Position_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_accountId_openOrderId_fkey" FOREIGN KEY ("accountId", "openOrderId") REFERENCES "Order"("accountId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
