/**
 * A key for one draft on this phone: it groups an AI quote's first generation with
 * its clarify reruns on the server (ai_generations.draft_key). Not a secret and not
 * an identity, so Math.random is enough; no native crypto module needed.
 */
export function newDraftKey(): string {
  const rand = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `${Date.now().toString(36)}-${rand()}-${rand()}`;
}
