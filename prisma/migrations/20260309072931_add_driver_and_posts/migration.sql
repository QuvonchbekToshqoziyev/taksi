-- AlterTable
ALTER TABLE "RideOrder" ALTER COLUMN "status" SET DEFAULT 'pending';

-- CreateTable
CREATE TABLE "Driver" (
    "id" SERIAL NOT NULL,
    "tgId" BIGINT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "carNumber" TEXT NOT NULL,
    "carPhotoId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverPost" (
    "id" SERIAL NOT NULL,
    "driverId" INTEGER NOT NULL,
    "fromName" TEXT NOT NULL,
    "toName" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "price" TEXT,
    "note" TEXT,
    "channelMsgId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicChannel" (
    "id" SERIAL NOT NULL,
    "chatId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_tgId_key" ON "Driver"("tgId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicChannel_chatId_key" ON "PublicChannel"("chatId");

-- AddForeignKey
ALTER TABLE "DriverPost" ADD CONSTRAINT "DriverPost_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
