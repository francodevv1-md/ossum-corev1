-- CreateTable
CREATE TABLE "personal_calendar_event" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personal_calendar_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_personal_calendar_event_company_id" ON "personal_calendar_event"("company_id", "id");

-- CreateIndex
CREATE INDEX "ix_personal_event_company_user_cancelled" ON "personal_calendar_event"("company_id", "user_id", "is_cancelled");

-- CreateIndex
CREATE INDEX "ix_personal_event_company_user_start" ON "personal_calendar_event"("company_id", "user_id", "start_date" ASC);

-- AddForeignKey
ALTER TABLE "personal_calendar_event" ADD CONSTRAINT "personal_calendar_event_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_calendar_event" ADD CONSTRAINT "personal_calendar_event_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
