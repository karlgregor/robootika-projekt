import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import type { Assistant } from "../src/services/assistant.js";

function createAssistant(): Assistant {
  return {
    transcribe: vi.fn().mockResolvedValue("Pane tuli põlema"),
    interpret: vi.fn().mockResolvedValue({
      kind: "DEVICE_COMMAND",
      command: "LIGHT_ON",
      replyText: "Panen tule põlema.",
    }),
  };
}

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("server", () => {
  it("serves the browser test interface", async () => {
    const app = await buildApp({ assistant: createAssistant() });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Kodu Assistant");
  });

  it("reports that it is healthy", async () => {
    const app = await buildApp({ assistant: createAssistant() });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("classifies text through the assistant", async () => {
    const assistant = createAssistant();
    const app = await buildApp({ assistant });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/interpret-text",
      payload: { text: "Siin on liiga pime" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      transcript: "Siin on liiga pime",
      kind: "DEVICE_COMMAND",
      command: "LIGHT_ON",
      replyText: "Panen tule põlema.",
    });
    expect(assistant.interpret).toHaveBeenCalledWith("Siin on liiga pime");
  });

  it("rejects an invalid text request", async () => {
    const app = await buildApp({ assistant: createAssistant() });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/interpret-text",
      payload: { text: "" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("INVALID_REQUEST");
  });

  it("transcribes and classifies an uploaded audio file", async () => {
    const assistant = createAssistant();
    const app = await buildApp({ assistant });
    apps.push(app);
    const boundary = "test-boundary";
    const payload = Buffer.from(
      `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="audio"; filename="recording.wav"\r\n' +
        "Content-Type: audio/wav\r\n\r\n" +
        "RIFF-test-audio\r\n" +
        `--${boundary}--\r\n`,
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/voice",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      transcript: "Pane tuli põlema",
      kind: "DEVICE_COMMAND",
      command: "LIGHT_ON",
      replyText: "Panen tule põlema.",
    });
    expect(assistant.transcribe).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "recording.wav",
        mimetype: "audio/wav",
      }),
    );
    expect(assistant.interpret).toHaveBeenCalledWith("Pane tuli põlema");
  });
});
