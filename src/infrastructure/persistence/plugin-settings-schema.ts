import * as v from 'valibot';

/**
 * Minimal structural validation for persisted plugin JSON (import / sanity checks).
 */
export const PluginDataRootSchema = v.object({
  settings: v.optional(v.any()),
  history: v.optional(v.any()),
  lastSeenVersion: v.optional(v.string()),
  schemaVersion: v.optional(v.number()),
});

export function looksLikePluginDataRoot(data: unknown): boolean {
  const r = v.safeParse(PluginDataRootSchema, data);
  if (!r.success) return false;
  const o = r.output;
  return (
    o.settings != null &&
    typeof o.settings === 'object' &&
    !Array.isArray(o.settings) &&
    o.history != null &&
    typeof o.history === 'object' &&
    !Array.isArray(o.history)
  );
}
