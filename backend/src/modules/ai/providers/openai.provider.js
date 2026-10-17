import { AI_PROVIDERS } from '../../../constants/aiProviders.js';
import { buildTicketAnalysisPrompt } from '../aiPrompts.js';
import { aiAnalysisJsonSchema, parseAndValidateAiAnalysisOutput } from '../aiOutput.schema.js';
import { createProviderHttpError } from '../aiErrors.js';

const buildBookContext = (bookContext) => bookContext;

export const createOpenAiProvider = ({
  apiKey,
  model,
  fetchImpl = fetch,
  timeoutMs = 60000,
}) => ({
  providerName: AI_PROVIDERS.OPENAI,
  modelName: model,

  async generateTicketAnalysis({ ticket, conversation, bookContext, knowledgeBase }) {
    const prompt = buildTicketAnalysisPrompt({
      ticket,
      conversation,
      bookContext: buildBookContext(bookContext),
      knowledgeBase,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'ticket_analysis',
              strict: true,
              schema: aiAnalysisJsonSchema,
            },
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw createProviderHttpError('OpenAI', response.status);
      }

      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('OpenAI response did not include structured content');
      }

      const validated = parseAndValidateAiAnalysisOutput(content);
      const usage = payload.usage
        ? {
            promptTokens: payload.usage.prompt_tokens ?? null,
            completionTokens: payload.usage.completion_tokens ?? null,
            totalTokens: payload.usage.total_tokens ?? null,
          }
        : null;

      return {
        provider: AI_PROVIDERS.OPENAI,
        model,
        data: validated,
        usage,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('OpenAI request timed out');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  },
});

export default createOpenAiProvider;
