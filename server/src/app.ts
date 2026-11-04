import multipart from "@fastify/multipart";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { Assistant } from "./services/assistant.js";
import { Control, settingsSchema } from "./control.js";

const textRequestSchema = z.object({
  text: z.string().min(1).max(1_000),
});

const allowedAudioTypes = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
]);

export interface BuildAppOptions {
  assistant: Assistant;
  logger?: boolean;
  control?: Control;
}

async function sendPublicFile(
  reply: FastifyReply,
  filename: string,
  contentType: string,
): Promise<FastifyReply> {
  const contents = await readFile(new URL(`../public/${filename}`, import.meta.url));
  return reply
    .header("Cache-Control", "no-store")
    .type(contentType)
    .send(contents);
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  const control = options.control ?? new Control();
  app.addHook("onRequest", async (request, reply) => {
    if (request.url.startsWith("/admin") || request.url.startsWith("/api/v1/admin")) {
      const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.ip);
      const origin = request.headers.origin;
      const sameOrigin = !origin || origin === `http://${request.headers.host}` || origin === `https://${request.headers.host}`;
      if (!local || !sameOrigin || request.headers["sec-fetch-site"] === "cross-site")
        return reply.status(403).send({ message: "Admin access requires localhost and the same origin." });
    }
  });
  app.addHook("onResponse", async (request, reply) => {
    if (!["/api/v1/voice", "/api/v1/interpret-text"].includes(request.url)) return;
    control.record({ requestId: request.id, path: request.url, status: reply.statusCode, durationMs: Math.round(reply.elapsedTime) });
  });
  async function interpret(text: string, requestId: string) {
    const started = performance.now();
    const { decision, source } = await control.interpret(text, () => options.assistant.interpret(text));
    control.record({ requestId, source, ...(control.get().logTranscripts ? { transcript: text, ...decision } : { kind: decision.kind, command: decision.command }), interpretationMs: Math.round(performance.now() - started) });
    return decision;
  }
  app.get("/admin", async (_request, reply) => sendPublicFile(reply, "admin.html", "text/html; charset=utf-8"));
  app.get("/admin.js", async (_request, reply) => sendPublicFile(reply, "admin.js", "text/javascript; charset=utf-8"));
  app.get("/api/v1/admin/settings", async () => control.get());
  app.put("/api/v1/admin/settings", async (request, reply) => {
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: parsed.error.issues.map((i) => i.message).join("; ") });
    const saved = await control.save(parsed.data);
    control.record({ event: "settings-saved" });
    return saved;
  });
  app.get("/api/v1/admin/logs", async () => control.logs);
  app.delete("/api/v1/admin/logs", async () => { control.logs.splice(0); return { status: "ok" }; });

  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 2 * 1024 * 1024,
      fields: 4,
    },
  });

  app.get("/", async (_request, reply) =>
    sendPublicFile(reply, "index.html", "text/html; charset=utf-8"),
  );
  app.get("/styles.css", async (_request, reply) =>
    sendPublicFile(reply, "styles.css", "text/css; charset=utf-8"),
  );
  app.get("/app.js", async (_request, reply) =>
    sendPublicFile(reply, "app.js", "text/javascript; charset=utf-8"),
  );

  app.get("/health", async () => ({ status: "ok" }));

  app.post("/api/v1/interpret-text", async (request, reply) => {
    const parsed = textRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "INVALID_REQUEST",
        message: "Body must contain a non-empty text field.",
      });
    }

    const decision = await interpret(parsed.data.text, request.id);
    return { transcript: parsed.data.text, ...decision };
  });

  app.post("/api/v1/voice", async (request, reply) => {
    const part = await request.file();
    if (!part) {
      return reply.status(400).send({
        error: "AUDIO_REQUIRED",
        message: "Upload one audio file in the audio form field.",
      });
    }

    if (part.fieldname !== "audio") {
      return reply.status(400).send({
        error: "INVALID_AUDIO_FIELD",
        message: "The audio file must use the audio form field.",
      });
    }

    const audioType = part.mimetype.split(";", 1)[0] ?? part.mimetype;
    if (!allowedAudioTypes.has(audioType)) {
      return reply.status(415).send({
        error: "UNSUPPORTED_AUDIO_TYPE",
        message: `Unsupported audio type: ${part.mimetype}`,
      });
    }

    const buffer = await part.toBuffer();
    if (buffer.length === 0) {
      return reply.status(400).send({
        error: "EMPTY_AUDIO",
        message: "The uploaded audio file is empty.",
      });
    }

    const transcriptionStarted = performance.now();
    const transcript = await options.assistant.transcribe({
      buffer,
      filename: part.filename || "recording.wav",
      mimetype: audioType,
    });
    control.record({ requestId: request.id, event: "transcription", transcriptionMs: Math.round(performance.now() - transcriptionStarted), audioBytes: buffer.length });
    const decision = await interpret(transcript, request.id);

    return { transcript, ...decision };
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    control.record({ requestId: request.id, event: "error", errorType: error instanceof Error ? error.name : "UnknownError", message: "Request failed; check the server terminal for details." });

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "FST_REQ_FILE_TOO_LARGE"
    ) {
      return reply.status(413).send({
        error: "AUDIO_TOO_LARGE",
        message: "Audio files may be at most 2 MB.",
      });
    }

    return reply.status(502).send({
      error: "ASSISTANT_SERVICE_ERROR",
      message: "The assistant could not process the request.",
    });
  });

  return app;
}
