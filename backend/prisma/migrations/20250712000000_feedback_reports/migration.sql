-- CreateTable
CREATE TABLE "feedback_reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "page_url" TEXT NOT NULL,
    "user_agent" TEXT,
    "role" TEXT,
    "user_id" TEXT,
    "screenshot_base64" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);
