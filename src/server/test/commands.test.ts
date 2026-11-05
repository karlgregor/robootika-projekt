import { describe, expect, it } from "vitest";
import { intentDecisionSchema } from "../src/domain/commands.js";

describe("intent decision schema", () => {
  it("accepts allow-listed commands", () => {
    expect(intentDecisionSchema.parse({
      kind: "DEVICE_COMMAND",
      command: "SLEEP_MODE",
      replyText: "Head ööd! Sulgen kardinad ja lülitan tuled välja.",
    })).toEqual({
      kind: "DEVICE_COMMAND",
      command: "SLEEP_MODE",
      replyText: "Head ööd! Sulgen kardinad ja lülitan tuled välja.",
    });
  });

  it("accepts a general answer without a hardware command", () => {
    expect(intentDecisionSchema.parse({
      kind: "ANSWER",
      command: "NONE",
      replyText: "Prantsusmaa pealinn on Pariis.",
    })).toEqual({
      kind: "ANSWER",
      command: "NONE",
      replyText: "Prantsusmaa pealinn on Pariis.",
    });
  });

  it("rejects arbitrary model output", () => {
    expect(() =>
      intentDecisionSchema.parse({
        kind: "DEVICE_COMMAND",
        command: "DELETE_EVERYTHING",
        replyText: "Teen seda.",
      }),
    ).toThrow();
  });

  it("rejects a hardware command disguised as an answer", () => {
    expect(() =>
      intentDecisionSchema.parse({
        kind: "ANSWER",
        command: "LIGHT_ON",
        replyText: "Vastus.",
      }),
    ).toThrow();
  });
});
