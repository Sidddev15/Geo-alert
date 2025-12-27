-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "createdAtIso" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "eventType" TEXT NOT NULL,
    "battery" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_createdAtIso_idx" ON "Event"("createdAtIso");
