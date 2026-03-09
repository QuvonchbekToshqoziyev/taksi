-- CreateTable
CREATE TABLE "Keyword" (
    "id" SERIAL NOT NULL,
    "phrase" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_phrase_key" ON "Keyword"("phrase");
