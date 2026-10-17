import Joi from 'joi';
import { TICKET_CATEGORY_VALUES } from '../../constants/ticketCategory.js';
import { TICKET_PRIORITY_VALUES } from '../../constants/ticketPriority.js';
import { isValidKnowledgeBaseId } from '../knowledge-base/knowledgeBaseIds.js';

export const aiAnalysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'category',
    'priority',
    'priorityRationale',
    'draftResponse',
    'knowledgeBaseReferences',
    'needsHumanReview',
  ],
  properties: {
    category: { type: 'string', enum: TICKET_CATEGORY_VALUES },
    priority: { type: 'string', enum: TICKET_PRIORITY_VALUES },
    priorityRationale: { type: 'string' },
    draftResponse: { type: 'string' },
    knowledgeBaseReferences: {
      type: 'array',
      items: { type: 'string' },
    },
    needsHumanReview: { type: 'boolean' },
  },
};

export const aiAnalysisOutputSchema = Joi.object({
  category: Joi.string()
    .valid(...TICKET_CATEGORY_VALUES)
    .required(),
  priority: Joi.string()
    .valid(...TICKET_PRIORITY_VALUES)
    .required(),
  priorityRationale: Joi.string().trim().min(1).max(2000).required(),
  draftResponse: Joi.string().trim().min(1).max(10000).required(),
  knowledgeBaseReferences: Joi.array()
    .items(Joi.string())
    .max(10)
    .custom((value, helpers) => {
      const invalid = value.filter((entry) => !isValidKnowledgeBaseId(entry));

      if (invalid.length > 0) {
        return helpers.message({
          custom: `Invalid knowledge base references: ${invalid.join(', ')}`,
        });
      }

      return value;
    })
    .required(),
  needsHumanReview: Joi.boolean().required(),
});

export const parseAndValidateAiAnalysisOutput = (rawOutput) => {
  let parsed = rawOutput;

  if (typeof rawOutput === 'string') {
    parsed = JSON.parse(rawOutput);
  }

  const { error, value } = aiAnalysisOutputSchema.validate(parsed, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((detail) => detail.message).join('; ');
    throw new Error(`AI output validation failed: ${details}`);
  }

  return value;
};

export default {
  aiAnalysisJsonSchema,
  aiAnalysisOutputSchema,
  parseAndValidateAiAnalysisOutput,
};
