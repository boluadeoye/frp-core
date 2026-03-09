CREATE TABLE "burn_registry" (
	"hash" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"flagged_at" timestamp DEFAULT now(),
	"severity" numeric(3, 2) DEFAULT '1.00'
);
--> statement-breakpoint
ALTER TABLE "audit_ledger" ADD COLUMN "header_hash" text;