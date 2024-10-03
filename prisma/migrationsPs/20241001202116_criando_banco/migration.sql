-- CreateTable
CREATE TABLE "WhatsAppAuth" (
    "userId" TEXT NOT NULL,
    "creds" JSONB NOT NULL,
    "qrCode" TEXT,
    "isConnected" BOOLEAN NOT NULL,
    "lastMessage" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAuth_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Key" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Key_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAuth_userId_key" ON "WhatsAppAuth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Key_userId_type_keyId_key" ON "Key"("userId", "type", "keyId");

-- AddForeignKey
ALTER TABLE "Key" ADD CONSTRAINT "Key_userId_fkey" FOREIGN KEY ("userId") REFERENCES "WhatsAppAuth"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
