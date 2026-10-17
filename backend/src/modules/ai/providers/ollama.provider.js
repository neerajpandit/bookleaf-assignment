import { AI_PROVIDERS } from '../../../constants/aiProviders.js';
import { buildTicketAnalysisPrompt } from '../aiPrompts.js';
import { aiAnalysisJsonSchema, parseAndValidateAiAnalysisOutput } from '../aiOutput.schema.js';
import { createProviderHttpError } from '../aiErrors.js';

export const createOllamaProvider = ({
  baseUrl,
  model,
  fetchImpl = fetch,
  timeoutMs = 60000,
}) => ({
  providerName: AI_PROVIDERS.OLLAMA,
  modelName: model,

  async generateTicketAnalysis({ ticket, conversation, bookContext, knowledgeBase }) {
    const prompt = buildTicketAnalysisPrompt({
      ticket,
      conversation,
      bookContext,
      knowledgeBase,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          stream: false,
          format: aiAnalysisJsonSchema,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw createProviderHttpError('Ollama', response.status);
      }

      const payload = await response.json();
      const content = payload.message?.content;

      if (!content) {
        throw new Error('Ollama response did not include structured content');
      }

      const validated = parseAndValidateAiAnalysisOutput(content);
      const usage = payload.prompt_eval_count || payload.eval_count
        ? {
            promptTokens: payload.prompt_eval_count ?? null,
            completionTokens: payload.eval_count ?? null,
            totalTokens:
              (payload.prompt_eval_count ?? 0) + (payload.eval_count ?? 0) || null,
          }
        : null;

      return {
        provider: AI_PROVIDERS.OLLAMA,
        model,
        data: validated,
        usage,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timed out');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  },
});

export default createOllamaProvider;
