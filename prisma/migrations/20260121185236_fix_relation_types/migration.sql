-- CreateTable
CREATE TABLE "BotAdmin" (
    "id" BIGSERIAL NOT NULL,
    "tgId" BIGINT NOT NULL,
    "username" TEXT,
    "fullName" TEXT,
    "isSuper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedirectGroup" (
    "id" SERIAL NOT NULL,
    "chatId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deleteOriginal" BOOLEAN NOT NULL DEFAULT false,
    "addedById" BIGINT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "RedirectGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotAdmin_tgId_key" ON "BotAdmin"("tgId");

-- CreateIndex
CREATE UNIQUE INDEX "RedirectGroup_chatId_key" ON "RedirectGroup"("chatId");

-- AddForeignKey
ALTER TABLE "RedirectGroup" ADD CONSTRAINT "RedirectGroup_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "BotAdmin"("tgId") ON DELETE RESTRICT ON UPDATE CASCADE;
