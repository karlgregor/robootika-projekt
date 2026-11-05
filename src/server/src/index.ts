import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { GroqAssistant } from "./services/assistant.js";
import { Control } from "./control.js";
import { fileURLToPath } from "node:url";

async function start(): Promise<void> {
  const config = loadConfig();
  const control = new Control(fileURLToPath(new URL("../data/settings.json", import.meta.url)));
  await control.load();
  const assistant = new GroqAssistant(config, undefined, () => control.get());
  const app = await buildApp({ assistant, control, logger: true });

  const close = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "Shutting down");
    await app.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void close("SIGINT"));
  process.once("SIGTERM", () => void close("SIGTERM"));

  await app.listen({ host: config.HOST, port: config.PORT });
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
