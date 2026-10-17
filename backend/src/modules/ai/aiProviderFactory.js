import { AI_PROVIDERS } from '../../constants/aiProviders.js';
import { loadAiConfig } from './aiConfig.js';
import { createOpenAiProvider } from './providers/openai.provider.js';
import { createOllamaProvider } from './providers/ollama.provider.js';

let cachedProvider = null;
let providerOverride = null;

export const setAiProviderForTests = (provider) => {
  providerOverride = provider;
};

export const resetAiProviderFactory = () => {
  cachedProvider = null;
  providerOverride = null;
};

export const createAiProviderFromConfig = (config, dependencies = {}) => {
  if (!config?.enabled) {
    return null;
  }

  if (config.provider === AI_PROVIDERS.OPENAI) {
    return createOpenAiProvider({
      apiKey: config.openai.apiKey,
      model: config.openai.model,
      fetchImpl: dependencies.fetchImpl,
      timeoutMs: config.requestTimeoutMs,
    });
  }

  if (config.provider === AI_PROVIDERS.OLLAMA) {
    return createOllamaProvider({
      baseUrl: config.ollama.baseUrl,
      model: config.ollama.model,
      fetchImpl: dependencies.fetchImpl,
      timeoutMs: config.requestTimeoutMs,
    });
  }

  throw new Error(`Unsupported AI provider: ${config.provider}`);
};

export const getAiProvider = (dependencies = {}) => {
  if (providerOverride) {
    return providerOverride;
  }

  if (cachedProvider) {
    return cachedProvider;
  }

  const config = loadAiConfig();
  cachedProvider = createAiProviderFromConfig(config, dependencies);
  return cachedProvider;
};

export const initializeAiProvider = (dependencies = {}) => {
  const config = loadAiConfig();

  if (!config.enabled) {
    return null;
  }

  cachedProvider = createAiProviderFromConfig(config, dependencies);
  return cachedProvider;
};

export default {
  getAiProvider,
  initializeAiProvider,
  createAiProviderFromConfig,
  setAiProviderForTests,
  resetAiProviderFactory,
};
