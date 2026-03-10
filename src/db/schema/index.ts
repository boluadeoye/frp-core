import { pgTable, uuid, text, boolean, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull().default("groq"),
  label: text("label"),
  keyValue: text("key_value").unique().notNull(),
  isActive: boolean("is_active").default(true),
  cooldownUntil: timestamp("cooldown_until").defaultNow(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  totalCalls: integer("total_calls").default(0),
  errorCount: integer("error_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLedger = pgTable("audit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: text("agent_id").notNull(),
  requestId: text("request_id").unique().notNull(),
  fcsScore: numeric("fcs_score", { precision: 4, scale: 3 }).default("0.000"),
  forensicManifest: jsonb("forensic_manifest").default({}),
  status: text("status").default("processing"),
  feeUsd: numeric("fee_usd", { precision: 10, scale: 2 }).default("0.10"),
  isBilled: boolean("is_billed").default(false),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  imageUrlRef: text("image_url_ref"),
  headerHash: text("header_hash"),
  oracleSignature: text("oracle_signature"), // NEW: The Cryptographic Anchor
});

export const burnRegistry = pgTable("burn_registry", {
  hash: text("hash").primaryKey(),
  reason: text("reason").notNull(),
  flaggedAt: timestamp("flagged_at").defaultNow(),
  severity: numeric("severity", { precision: 3, scale: 2 }).default("1.00"),
});
