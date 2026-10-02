CREATE TABLE "publication_analytics_cache" (
    "publicationId" TEXT NOT NULL,
    "zernioPostId" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL,
    "message" TEXT,
    "publishedAt" TIMESTAMP(3),
    "aggregate" JSONB,
    "platforms" JSONB NOT NULL DEFAULT '[]',
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_analytics_cache_pkey" PRIMARY KEY ("publicationId")
);

CREATE TABLE "zernio_analytics_sync_state" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "nextCursor" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zernio_analytics_sync_state_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "publication_analytics_cache_zernioPostId_idx" ON "publication_analytics_cache"("zernioPostId");
CREATE INDEX "publication_analytics_cache_syncedAt_idx" ON "publication_analytics_cache"("syncedAt");

ALTER TABLE "publication_analytics_cache" ADD CONSTRAINT "publication_analytics_cache_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "zernio_analytics_sync_state" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);
