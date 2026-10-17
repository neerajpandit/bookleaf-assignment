import Joi from 'joi';
import { AI_PROVIDER_VALUES, AI_PROVIDERS } from '../../constants/aiProviders.js';

let cachedAiConfig = null;

const openAiSchema = Joi.object({
  AI_PROVIDER: Joi.string().valid(AI_PROVIDERS.OPENAI).required(),
  OPENAI_API_KEY: Joi.string().min(1).required(),
  OPENAI_MODEL: Joi.string().min(1).required(),
  AI_REQUEST_TIMEOUT_MS: Joi.number().integer().min(1000).default(60000),
}).unknown(true);

const ollamaSchema = Joi.object({
  AI_PROVIDER: Joi.string().valid(AI_PROVIDERS.OLLAMA).required(),
  OLLAMA_BASE_URL: Joi.string().uri().required(),
  OLLAMA_MODEL: Joi.string().min(1).required(),
  AI_REQUEST_TIMEOUT_MS: Joi.number().integer().min(1000).default(60000),
}).unknown(true);

export const loadAiConfig = (env = process.env) => {
  if (cachedAiConfig) {
    return cachedAiConfig;
  }

  if (!env.AI_PROVIDER) {
    cachedAiConfig = { enabled: false };
    return cachedAiConfig;
  }

  if (!AI_PROVIDER_VALUES.includes(env.AI_PROVIDER)) {
    throw new Error(
      `Environment configuration error: AI_PROVIDER must be one of ${AI_PROVIDER_VALUES.join(', ')}`,
    );
  }

  const schema = env.AI_PROVIDER === AI_PROVIDERS.OPENAI ? openAiSchema : ollamaSchema;
  const { error, value } = schema.validate(env, { abortEarly: false });

  if (error) {
    const details = error.details.map((detail) => detail.message).join('; ');
    throw new Error(`AI configuration error: ${details}`);
  }

  cachedAiConfig = {
    enabled: true,
    provider: value.AI_PROVIDER,
    requestTimeoutMs: value.AI_REQUEST_TIMEOUT_MS,
    openai:
      value.AI_PROVIDER === AI_PROVIDERS.OPENAI
        ? {
            apiKey: value.OPENAI_API_KEY,
            model: value.OPENAI_MODEL,
          }
        : null,
    ollama:
      value.AI_PROVIDER === AI_PROVIDERS.OLLAMA
        ? {
            baseUrl: value.OLLAMA_BASE_URL.replace(/\/$/, ''),
            model: value.OLLAMA_MODEL,
          }
        : null,
  };

  return cachedAiConfig;
};

export const resetAiConfigCache = () => {
  cachedAiConfig = null;
};

export default {
  loadAiConfig,
  resetAiConfigCache,
};
