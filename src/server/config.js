import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional().default('postgresql://postgres:postgres@localhost:5432/trustgate_db'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GATEWAY_SECRET_KEY: z.string().default('9f8e7d6c5b4a39281706f5e4d3c2b1a0e9f8d7c6b5a4938271605f4e3d2c1b0a'),
  ENFORCE_STORAGE_ENCRYPTION: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  DEFAULT_CLIENT_RATE_LIMIT: z.coerce.number().default(100),
});

export const config = EnvSchema.parse(process.env);
