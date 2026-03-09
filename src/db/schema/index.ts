import { pgTable, uuid, text, boolean, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";

// 1. API KEY POOL: Tracks Groq Keys and their Rate-Limit States
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull().default("groq"),
  label: text("label"),
  keyValue: text("key_value").unique().notNull(),
  isActive: boolean("is_active").default(true),
  
  // Rate Limit Management
  cooldownUntil: timestamp("cooldown_until").defaultNow(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  totalCalls: integer("total_calls").default(0),
  errorCount: integer("error_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. AUDIT LEDGER: The "Machine Money" record
export const auditLedger = pgTable("audit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: text("agent_id").notNull(),
  requestId: text("request_id").unique().notNull(),
  
  // The Forensic Confidence Score (FCS)
  fcsScore: numeric("fcs_score", { precision: 4, scale: 3 }).default("0.000"),
  
  // The Decision Trace (Metadata + Visual + Spatial)
  forensicManifest: jsonb("forensic_manifest").default({}),
  
  status: text("status").default("processing"), // 'processing', 'verified', 'flagged', 'failed'
  feeUsd: numeric("fee_usd", { precision: 10, scale: 2 }).default("0.10"),
  isBilled: boolean("is_billed").default(false),
  
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  
  imageUrlRef: text("image_url_ref"),
});
