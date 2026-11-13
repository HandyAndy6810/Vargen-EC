import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiConfigFromEnv } from './ai-config';

const GROQ = 'https://api.groq.com/openai/v1';

test('AI_CHAT_MODEL picks the chat model', () => {
  assert.equal(aiConfigFromEnv({ AI_INTEGRATIONS_OPENAI_BASE_URL: GROQ, AI_CHAT_MODEL: 'some/new-model' }).model, 'some/new-model');
  assert.equal(aiConfigFromEnv({ AI_CHAT_MODEL: 'gpt-x' }).model, 'gpt-x');
});

test('defaults: gpt-oss-120b on Groq, gpt-4o elsewhere', () => {
  const groq = aiConfigFromEnv({ AI_INTEGRATIONS_OPENAI_BASE_URL: GROQ });
  assert.equal(groq.model, 'openai/gpt-oss-120b');
  assert.equal(groq.isGroq, true);
  assert.equal(groq.transcribeModel, 'whisper-large-v3-turbo');
  assert.equal(groq.supportsVision, false);
  assert.equal(groq.visionModel, '');
  const other = aiConfigFromEnv({});
  assert.equal(other.model, 'gpt-4o');
  assert.equal(other.supportsVision, true);
  assert.equal(other.visionModel, 'gpt-4o');
});

test('vision on Groq only when switched on; AI_VISION_MODEL wins', () => {
  assert.equal(aiConfigFromEnv({ AI_INTEGRATIONS_OPENAI_BASE_URL: GROQ, AI_SUPPORTS_VISION: 'true' }).visionModel, 'openai/gpt-oss-120b');
  assert.equal(aiConfigFromEnv({ AI_INTEGRATIONS_OPENAI_BASE_URL: GROQ, AI_VISION_MODEL: 'v' }).visionModel, 'v');
});

test('the key and base URL are read from the env as they are', () => {
  const c = aiConfigFromEnv({ AI_INTEGRATIONS_OPENAI_BASE_URL: GROQ, AI_INTEGRATIONS_OPENAI_API_KEY: 'k' });
  assert.equal(c.baseURL, GROQ);
  assert.equal(c.apiKey, 'k');
});
