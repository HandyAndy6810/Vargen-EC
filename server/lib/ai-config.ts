/**
 * Which AI provider and models the server uses, from its environment. The one
 * place that reads these env vars, so the routes and the model comparison
 * script (eval/) agree on the defaults.
 *
 * Model IDs are env-overridable so a provider rotation (Groq retires models
 * often) doesn't need a code change. Groq deprecated llama-3.3-70b-versatile on
 * 2026-08-16; gpt-oss-120b is its recommended replacement. Transcription on Groq
 * is Whisper: gpt-4o-mini-transcribe is OpenAI-only and Groq never served it.
 *
 * Dependency-free and pure: tested in ai-config.test.ts.
 */

type Env = Record<string, string | undefined>;

export type AiConfig = {
  baseURL: string | undefined;
  apiKey: string | undefined;
  isGroq: boolean;
  /** The chat model: quotes, intake, matching. */
  model: string;
  transcribeModel: string;
  /** gpt-oss (and most Groq text models) are text-only: don't send job photos to them. */
  supportsVision: boolean;
  /**
   * Reading a receipt needs a model that can actually see. The chat model does
   * not have to be one: Groq's gpt-oss is text-only, so scanning a receipt sent
   * an image to a model incapable of looking at it and failed every time. Set
   * AI_VISION_MODEL to a multimodal model to enable it. Empty means none.
   */
  visionModel: string;
};

export function aiConfigFromEnv(env: Env = process.env): AiConfig {
  const baseURL = env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const isGroq = (baseURL || '').includes('groq');
  const model = env.AI_CHAT_MODEL || (isGroq ? 'openai/gpt-oss-120b' : 'gpt-4o');
  const supportsVision = env.AI_SUPPORTS_VISION === 'true' || !isGroq;
  return {
    baseURL,
    apiKey: env.AI_INTEGRATIONS_OPENAI_API_KEY,
    isGroq,
    model,
    transcribeModel: env.AI_TRANSCRIBE_MODEL || (isGroq ? 'whisper-large-v3-turbo' : 'gpt-4o-mini-transcribe'),
    supportsVision,
    visionModel: env.AI_VISION_MODEL || (supportsVision ? model : ''),
  };
}
