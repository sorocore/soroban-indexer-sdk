CREATE TABLE IF NOT EXISTS "cursors" (
	"indexer_id" varchar(64) PRIMARY KEY NOT NULL,
	"last_ledger" integer NOT NULL,
	"status" varchar(16) NOT NULL,
	"error_message" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"contract_id" varchar(56) NOT NULL,
	"type" varchar(16) NOT NULL,
	"topics" jsonb NOT NULL,
	"value" text NOT NULL,
	"transaction_hash" varchar(64) NOT NULL,
	"ledger_sequence" integer NOT NULL,
	"timestamp" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledgers" (
	"sequence" integer PRIMARY KEY NOT NULL,
	"hash" varchar(64) NOT NULL,
	"prev_hash" varchar(64) NOT NULL,
	"timestamp" integer NOT NULL,
	"transaction_count" integer NOT NULL,
	"operation_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_ledger_sequence_ledgers_sequence_fk" FOREIGN KEY ("ledger_sequence") REFERENCES "public"."ledgers"("sequence") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
