-- Persist and deduplicate client requests discovered in Telegram groups.
ALTER TABLE "RideOrder"
  ALTER COLUMN "status" SET DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "time" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceChatId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceMessageId" INTEGER,
  ADD COLUMN IF NOT EXISTS "sourceText" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceTitle" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "RideOrder_sourceChatId_sourceMessageId_key"
  ON "RideOrder"("sourceChatId", "sourceMessageId");

UPDATE "RideOrder"
SET "status" = CASE lower("status")
  WHEN 'active' THEN 'NEW'
  WHEN 'pending' THEN 'NEW'
  WHEN 'new' THEN 'NEW'
  WHEN 'matched' THEN 'MATCHED'
  WHEN 'cancelled' THEN 'CANCELLED'
  WHEN 'expired' THEN 'EXPIRED'
  ELSE "status"
END;

-- Bring Driver in line with the runtime and require explicit approval for new drivers.
ALTER TABLE "Driver"
  ALTER COLUMN "status" SET DEFAULT 'OFFLINE',
  ALTER COLUMN "isApproved" SET DEFAULT false,
  ADD COLUMN IF NOT EXISTS "seatsAvailable" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "fromLocation" TEXT,
  ADD COLUMN IF NOT EXISTS "toLocation" TEXT,
  ADD COLUMN IF NOT EXISTS "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Driver"
SET "status" = CASE lower("status")
  WHEN 'idle' THEN 'OFFLINE'
  WHEN 'not_working' THEN 'OFFLINE'
  WHEN 'available' THEN 'AVAILABLE'
  WHEN 'full' THEN 'FULL'
  WHEN 'en_route' THEN 'EN_ROUTE'
  ELSE "status"
END;

-- Legacy drivers were auto-approved by the old default. Require the admin to
-- explicitly approve the priority-driver roster once after this migration.
UPDATE "Driver" SET "isApproved" = false, "status" = 'OFFLINE';

-- One accepted request creates exactly one ride.
CREATE TABLE IF NOT EXISTS "Ride" (
  "id" SERIAL NOT NULL,
  "driverId" INTEGER NOT NULL,
  "clientRequestId" INTEGER NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'CREATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Ride_clientRequestId_key"
  ON "Ride"("clientRequestId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ride_driverId_fkey') THEN
    ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverId_fkey"
      FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ride_clientRequestId_fkey') THEN
    ALTER TABLE "Ride" ADD CONSTRAINT "Ride_clientRequestId_fkey"
      FOREIGN KEY ("clientRequestId") REFERENCES "RideOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Track every Telegram copy of an ad so closing it can remove those messages.
CREATE TABLE IF NOT EXISTS "DriverPostMessage" (
  "id" SERIAL NOT NULL,
  "postId" INTEGER NOT NULL,
  "chatId" TEXT NOT NULL,
  "messageId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverPostMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DriverPostMessage_postId_fkey" FOREIGN KEY ("postId")
    REFERENCES "DriverPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DriverPostMessage_postId_chatId_messageId_key"
  ON "DriverPostMessage"("postId", "chatId", "messageId");
