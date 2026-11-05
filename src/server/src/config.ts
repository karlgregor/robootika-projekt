import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  GROQ_TRANSCRIPTION_MODEL: z.string().default("whisper-large-v3-turbo"),
  GROQ_INTENT_MODEL: z.string().default("openai/gpt-oss-20b"),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse(environment);
}
