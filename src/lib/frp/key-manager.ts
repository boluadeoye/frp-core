import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, and, lt, asc } from "drizzle-orm";

export interface GroqKey {
  id: string;
  keyValue: string;
  provider: string;
}

export class KeyManager {
  /**
   * Fetches the next available API key from the Neon database.
   * Uses LRU (Least Recently Used) logic to balance load across the pool.
   */
  static async getValidKey(): Promise<GroqKey | null> {
    const now = new Date();

    // Find keys that are active and NOT in cooldown
    const availableKeys = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.isActive, true),
          lt(apiKeys.cooldownUntil, now)
        )
      )
      .orderBy(asc(apiKeys.lastUsedAt))
      .limit(1);

    if (!availableKeys || availableKeys.length === 0) {
      console.error("[KeyManager] No available keys in pool.");
      return null;
    }

    const selectedKey = availableKeys[0];

    // Update the 'lastUsedAt' and 'totalCalls' immediately (Atomic-ish)
    await db
      .update(apiKeys)
      .set({ 
        lastUsedAt: now,
        totalCalls: (selectedKey.totalCalls || 0) + 1 
      })
      .where(eq(apiKeys.id, selectedKey.id));

    return {
      id: selectedKey.id,
      keyValue: selectedKey.keyValue,
      provider: selectedKey.provider,
    };
  }

  /**
   * Benches a key if it returns a 429 (Rate Limit).
   * Default cooldown is 60 seconds.
   */
  static async reportRateLimit(keyId: string, retryAfterSeconds: number = 60) {
    const cooldownDate = new Date(Date.now() + retryAfterSeconds * 1000);
    
    await db
      .update(apiKeys)
      .set({ 
        cooldownUntil: cooldownDate,
        errorCount: db.select({ errorCount: apiKeys.errorCount }).from(apiKeys).where(eq(apiKeys.id, keyId)) as any // Increment logic
      })
      .where(eq(apiKeys.id, keyId));
      
    console.warn(`[KeyManager] Key ${keyId} benched until ${cooldownDate.toISOString()}`);
  }
}
