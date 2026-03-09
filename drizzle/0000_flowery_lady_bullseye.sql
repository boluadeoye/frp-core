CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'groq' NOT NULL,
	"label" text,
	"key_value" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"cooldown_until" timestamp DEFAULT now(),
	"last_used_at" timestamp DEFAULT now(),
	"total_calls" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "api_keys_key_value_unique" UNIQUE("key_value")
);
--> statement-breakpoint
CREATE TABLE "audit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"request_id" text NOT NULL,
	"fcs_score" numeric(4, 3) DEFAULT '0.000',
	"forensic_manifest" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'processing',
	"fee_usd" numeric(10, 2) DEFAULT '0.10',
	"is_billed" boolean DEFAULT false,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"image_url_ref" text,
	CONSTRAINT "audit_ledger_request_id_unique" UNIQUE("request_id")
);
