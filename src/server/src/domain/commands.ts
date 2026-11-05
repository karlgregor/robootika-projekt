import { z } from "zod";

export const commandValues = [
  "LIGHT_ON",
  "LIGHT_OFF",
  "FAN_ON",
  "FAN_OFF",
  "BLINDS_OPEN",
  "BLINDS_CLOSE",
  "REPORT_TEMPERATURE",
  "SLEEP_MODE",
  "NONE",
] as const;

export const commandSchema = z.enum(commandValues);

export const responseKindValues = ["DEVICE_COMMAND", "ANSWER", "UNSUPPORTED"] as const;
export const responseKindSchema = z.enum(responseKindValues);

export const intentDecisionSchema = z.object({
  kind: responseKindSchema,
  command: commandSchema,
  replyText: z.string().min(1),
}).superRefine((decision, context) => {
  if (decision.kind === "DEVICE_COMMAND" && decision.command === "NONE") {
    context.addIssue({
      code: "custom",
      message: "A device command must contain an allow-listed command",
      path: ["command"],
    });
  }

  if (decision.kind !== "DEVICE_COMMAND" && decision.command !== "NONE") {
    context.addIssue({
      code: "custom",
      message: "Answers and unsupported requests must not contain a device command",
      path: ["command"],
    });
  }
});

export type Command = z.infer<typeof commandSchema>;
export type IntentDecision = z.infer<typeof intentDecisionSchema>;

export const intentDecisionJsonSchema = {
  type: "object",
  properties: {
    kind: {
      type: "string",
      enum: responseKindValues,
      description: "Whether this is a device command, an answer to a question, or an unsupported request.",
    },
    command: {
      type: "string",
      enum: commandValues,
      description: "The single supported action that best matches the user's request.",
    },
    replyText: {
      type: "string",
      description: "A concise response in the same language as the user.",
    },
  },
  required: ["kind", "command", "replyText"],
  additionalProperties: false,
} as const;
