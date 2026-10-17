import Joi from 'joi';

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Za-z]/, { name: 'letter' })
  .pattern(/[0-9]/, { name: 'number' })
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.name': 'Password must contain at least one {#name}',
  });

const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .trim()
  .lowercase()
  .required();

export const registerSchema = Joi.object({
  email: emailSchema,
  authorId: Joi.string().trim().required(),
  invitationToken: Joi.string().min(16).max(256).required(),
  password: passwordSchema,
});

export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required(),
});

export default {
  registerSchema,
  loginSchema,
};
