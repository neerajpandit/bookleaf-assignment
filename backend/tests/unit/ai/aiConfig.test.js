import { describe, it, expect, beforeEach } from '@jest/globals';
import { loadAiConfig, resetAiConfigCache } from '../../../src/modules/ai/aiConfig.js';

describe('AI configuration', () => {
  beforeEach(() => {
    resetAiConfigCache();
  });

  it('disables AI when AI_PROVIDER is unset', () => {
    const config = loadAiConfig({ NODE_ENV: 'test' });

    expect(config.enabled).toBe(false);
  });

  it('validates OpenAI settings for the selected provider only', () => {
    const config = loadAiConfig({
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'gpt-4o-mini',
    });

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('openai');
    expect(config.openai.model).toBe('gpt-4o-mini');
    expect(config.ollama).toBeNull();
  });

  it('validates Ollama settings for the selected provider only', () => {
    const config = loadAiConfig({
      AI_PROVIDER: 'ollama',
      OLLAMA_BASE_URL: 'http://localhost:11434',
      OLLAMA_MODEL: 'llama3.2',
    });

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('ollama');
    expect(config.ollama.baseUrl).toBe('http://localhost:11434');
    expect(config.openai).toBeNull();
  });

  it('does not require credentials for the unselected provider', () => {
    expect(() =>
      loadAiConfig({
        AI_PROVIDER: 'openai',
        OPENAI_API_KEY: 'test-key',
        OPENAI_MODEL: 'gpt-4o-mini',
      }),
    ).not.toThrow();

    resetAiConfigCache();

    expect(() =>
      loadAiConfig({
        AI_PROVIDER: 'ollama',
        OLLAMA_BASE_URL: 'http://localhost:11434',
        OLLAMA_MODEL: 'llama3.2',
      }),
    ).not.toThrow();
  });

  it('fails clearly for invalid AI_PROVIDER values', () => {
    expect(() =>
      loadAiConfig({
        AI_PROVIDER: 'anthropic',
      }),
    ).toThrow(/AI_PROVIDER must be one of openai, ollama/);
  });

  it('fails when selected OpenAI credentials are missing', () => {
    expect(() =>
      loadAiConfig({
        AI_PROVIDER: 'openai',
        OPENAI_MODEL: 'gpt-4o-mini',
      }),
    ).toThrow(/AI configuration error/);
  });

  it('fails when selected Ollama settings are missing', () => {
    expect(() =>
      loadAiConfig({
        AI_PROVIDER: 'ollama',
        OLLAMA_MODEL: 'llama3.2',
      }),
    ).toThrow(/AI configuration error/);
  });
});
