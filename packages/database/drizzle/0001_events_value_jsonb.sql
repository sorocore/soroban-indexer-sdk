ALTER TABLE "events" ALTER COLUMN "value" SET DATA TYPE jsonb USING "value"::jsonb;
