import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Control } from "../src/control.js";
import { buildApp } from "../src/app.js";
import { buildSystemPrompt } from "../src/services/assistant.js";

describe("control panel", () => {
  it("passes enabled semantic rules and context to AI instead of exact matching", async () => {
    const control = new Control();
    const settings = control.get();
    settings.context = "The fan is on the desk.";
    settings.rules.push({ phrase: "The user hints they need a breeze", matchMode: "semantic", command: "FAN_ON", replyText: "Starting the fan.", enabled: true });
    await control.save(settings);
    const ai = vi.fn().mockResolvedValue({ kind: "DEVICE_COMMAND", command: "FAN_ON", replyText: "Starting the fan." });
    expect((await control.interpret("The user hints they need a breeze", ai)).source).toBe("groq");
    expect(ai).toHaveBeenCalledOnce();
    expect(buildSystemPrompt(control.get())).toContain("The fan is on the desk.");
    expect(buildSystemPrompt(control.get())).toContain("The user hints they need a breeze");
    settings.rules[0]!.enabled = false;
    expect(buildSystemPrompt(settings)).not.toContain("The user hints they need a breeze");
  });

  it("persists rules and matches normalized phrases without calling Groq", async () => {
    const directory = await mkdtemp(join(tmpdir(), "assistant-control-"));
    try {
      const path = join(directory, "settings.json");
      const control = new Control(path);
      const settings = control.get();
      settings.rules.push({ phrase: "Head ööd", command: "SLEEP_MODE", replyText: "Head ööd!", enabled: true });
      await control.save(settings);
      const restored = new Control(path);
      await restored.load();
      const ai = vi.fn();
      const result = await restored.interpret("  HEAD   ÖÖD! ", ai);
      expect(result.source).toBe("phrase-rule");
      expect(result.decision.command).toBe("SLEEP_MODE");
      expect(ai).not.toHaveBeenCalled();
      const disabled = restored.get();
      disabled.commands.find((c) => c.command === "SLEEP_MODE")!.enabled = false;
      await restored.save(disabled);
      expect((await restored.interpret("Head ööd", ai)).decision.command).toBe("NONE");
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("blocks AI when disabled and bounds logs", async () => {
    const control = new Control();
    await control.save({ ...control.get(), aiEnabled: false });
    const ai = vi.fn();
    expect((await control.interpret("Hello", ai)).source).toBe("settings");
    expect(ai).not.toHaveBeenCalled();
    for (let i = 0; i < 250; i++) control.record({ index: i });
    expect(control.logs).toHaveLength(200);
    expect(control.logs[0]?.index).toBe(249);
  });

  it("protects settings, validates edits, and logs request decisions", async () => {
    const assistant = { transcribe: vi.fn(), interpret: vi.fn().mockResolvedValue({ kind: "ANSWER", command: "NONE", replyText: "Hello" }) };
    const app = await buildApp({ assistant });
    try {
      expect((await app.inject({ url: "/admin", remoteAddress: "192.168.1.4" })).statusCode).toBe(403);
      expect((await app.inject({ url: "/api/v1/admin/settings", headers: { origin: "https://other.example" } })).statusCode).toBe(403);
      expect((await app.inject({ url: "/admin" })).statusCode).toBe(200);
      expect((await app.inject({ method: "PUT", url: "/api/v1/admin/settings", payload: {} })).statusCode).toBe(400);
      await app.inject({ method: "POST", url: "/api/v1/interpret-text", payload: { text: "Hello" } });
      const logs = (await app.inject({ url: "/api/v1/admin/logs" })).json();
      expect(logs.some((e: { source?: string }) => e.source === "groq")).toBe(true);
    } finally { await app.close(); }
  });
});
