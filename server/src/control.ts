import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { commandSchema, commandValues, type IntentDecision } from "./domain/commands.js";

export const settingsSchema = z.object({
  context: z.string().trim().max(8000).default(""),
  aiEnabled: z.boolean(),
  questionsEnabled: z.boolean(),
  logTranscripts: z.boolean(),
  commands: z.array(z.object({
    command: commandSchema.exclude(["NONE"]),
    enabled: z.boolean(),
    description: z.string().trim().min(1).max(500),
  })).length(commandValues.length - 1),
  rules: z.array(z.object({
    phrase: z.string().trim().min(1).max(1000),
    command: commandSchema,
    replyText: z.string().trim().min(1).max(1000),
    enabled: z.boolean(),
    matchMode: z.enum(["exact", "semantic"]).optional(),
  })).max(100),
}).superRefine((settings, ctx) => {
  if (new Set(settings.commands.map((c) => c.command)).size !== settings.commands.length)
    ctx.addIssue({ code: "custom", message: "Each command must appear exactly once" });
  const phrases = settings.rules.filter((r) => r.enabled).map((r) => normalize(r.phrase));
  if (new Set(phrases).size !== phrases.length)
    ctx.addIssue({ code: "custom", message: "Enabled phrases must be unique" });
});
export type Settings = z.infer<typeof settingsSchema>;
export const normalize = (text: string): string => text.toLocaleLowerCase("et").replace(/[.!?,;:]+/g, " ").replace(/\s+/g, " ").trim();
const descriptions = ["Turn the light on, including saying it is too dark", "Turn the light off", "Turn the fan on", "Turn the fan off", "Open the blinds or hatch", "Close the blinds or hatch", "Ask for the room temperature", "Going to sleep: turn lights off and close blinds"];
export function defaultSettings(): Settings {
  return { context: "", aiEnabled: true, questionsEnabled: true, logTranscripts: true,
    commands: commandValues.filter((c) => c !== "NONE").map((command, i) => ({ command, enabled: true, description: descriptions[i]! })), rules: [] };
}
export class Control {
  private settings = defaultSettings();
  private pending = Promise.resolve();
  readonly logs: Array<Record<string, unknown>> = [];
  constructor(private readonly path?: string) {}
  async load(): Promise<void> {
    if (!this.path) return;
    try { this.settings = settingsSchema.parse(JSON.parse(await readFile(this.path, "utf8"))); }
    catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
  }
  get(): Settings { return structuredClone(this.settings); }
  async save(value: unknown): Promise<Settings> {
    const next = settingsSchema.parse(value);
    const operation = this.pending.then(async () => {
      if (this.path) {
        await mkdir(dirname(this.path), { recursive: true });
        await writeFile(`${this.path}.tmp`, JSON.stringify(next, null, 2), { mode: 0o600 });
        await rename(`${this.path}.tmp`, this.path);
      }
      this.settings = next;
    });
    this.pending = operation.catch(() => {});
    await operation;
    return this.get();
  }
  record(entry: Record<string, unknown>): void {
    this.logs.unshift({ ...entry, time: new Date().toISOString() });
    this.logs.splice(200);
  }
  async interpret(text: string, ai: () => Promise<IntentDecision>): Promise<{ decision: IntentDecision; source: string }> {
    const settings = this.get();
    const blocked = (message: string) => ({ kind: "UNSUPPORTED" as const, command: "NONE" as const, replyText: message });
    const rule = settings.rules.find((r) => r.enabled && r.matchMode !== "semantic" && normalize(r.phrase) === normalize(text));
    let decision: IntentDecision;
    let source: string;
    if (rule) {
      source = "phrase-rule";
      decision = { kind: rule.command === "NONE" ? "ANSWER" : "DEVICE_COMMAND", command: rule.command, replyText: rule.replyText };
    } else if (!settings.aiEnabled) {
      return { decision: blocked("AI is disabled. No matching phrase rule."), source: "settings" };
    } else { source = "groq"; decision = await ai(); }
    if (decision.command !== "NONE" && !settings.commands.some((c) => c.command === decision.command && c.enabled))
      decision = blocked("This command is disabled.");
    if (decision.kind === "ANSWER" && !settings.questionsEnabled)
      decision = blocked("General answers are disabled.");
    return { decision, source };
  }
}
