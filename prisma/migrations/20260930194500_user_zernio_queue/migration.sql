-- CreateTable
CREATE TABLE "user_zernio_queue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "zernioProfileId" TEXT NOT NULL,
    "zernioQueueId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "timezone" TEXT NOT NULL,
    "slots" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_zernio_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_zernio_queue_userId_key" ON "user_zernio_queue"("userId");

-- CreateIndex
CREATE INDEX "user_zernio_queue_zernioQueueId_idx" ON "user_zernio_queue"("zernioQueueId");

-- AddForeignKey
ALTER TABLE "user_zernio_queue" ADD CONSTRAINT "user_zernio_queue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
