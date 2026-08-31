import { z } from "zod";

import { capabilityPolicies, capabilityValues } from "./capabilities";

const UuidSchema = z.string().uuid();
const DateTimeSchema = z.string().datetime({ offset: true });

export const AskInstructionSchema = z.string().trim().min(1).max(2000);

export const AiJobOriginSchema = z.enum([
  "inline_ask",
  "global_ask",
  "operator",
  "capture",
  "system"
]);

export const AiJobStatusSchema = z.enum([
  "queued",
  "working",
  "completed",
  "stuck",
  "cancelled"
]);

export const SourceHealthStatusSchema = z.enum([
  "healthy",
  "disconnected",
  "permission_expired",
  "sync_delayed",
  "partial_sync",
  "unavailable",
  "stale",
  "offline",
  "error",
  "not_configured"
]);

export const ItemStateSchema = z.enum([
  "needs_you",
  "draft_ready",
  "queued",
  "working",
  "waiting",
  "done",
  "stuck",
  "archived"
]);

export const AttentionTierSchema = z.enum([
  "needs_you",
  "in_motion",
  "waiting",
  "handled"
]);

export const ItemEnvelopeSchema = z.strictObject({
  id: UuidSchema,
  workspaceId: UuidSchema,
  stableKey: z.string().min(1).max(300),
  version: z.number().int().positive(),
  state: ItemStateSchema,
  tier: AttentionTierSchema,
  priority: z.number().int().min(0).max(100),
  attentionRank: z.number().int(),
  titleLead: z.string().min(1).max(100),
  situation: z.string().min(1).max(320),
  recommendation: z.string().max(500).nullable(),
  requiresUserAttention: z.boolean(),
  dueAt: DateTimeSchema.nullable(),
  reviewAt: DateTimeSchema.nullable(),
  waitingSince: DateTimeSchema.nullable(),
  projectId: UuidSchema.nullable(),
  currentRevisionId: UuidSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  archivedAt: DateTimeSchema.nullable()
});

const BlockBaseShape = {
  id: z.string().min(1).max(100),
  schemaVersion: z.literal(1),
  fallbackText: z.string().min(1).max(800)
};

export const TextBlockSchema = z.strictObject({
  ...BlockBaseShape,
  type: z.literal("text"),
  text: z.string().max(1200)
});

export const QuoteBlockSchema = z.strictObject({
  ...BlockBaseShape,
  type: z.literal("quote"),
  label: z.string().max(120),
  quote: z.string().max(1200),
  attribution: z.string().max(160).optional()
});

export const CalloutBlockSchema = z.strictObject({
  ...BlockBaseShape,
  type: z.literal("callout"),
  text: z.string().max(1000),
  tone: z.enum(["reasoning", "warning", "success"])
});

const TableCellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const ComparisonTableBlockSchema = z.strictObject({
  ...BlockBaseShape,
  type: z.literal("comparison_table"),
  columns: z.array(z.strictObject({
    key: z.string().min(1),
    label: z.string().min(1),
    align: z.enum(["left", "right"]).optional()
  })).min(1).max(5),
  rows: z.array(z.strictObject({
    id: z.string().min(1),
    cells: z.record(z.string(), TableCellSchema)
  })).max(5),
  recommendedRowId: z.string().optional()
});

export const SlotsBlockSchema = z.strictObject({
  ...BlockBaseShape,
  type: z.literal("slots"),
  options: z.array(z.strictObject({
    id: z.string().min(1),
    label: z.string().min(1),
    start: DateTimeSchema,
    end: DateTimeSchema,
    detail: z.string().optional()
  })).max(8),
  recommendedOptionId: z.string().optional(),
  overflowLabel: z.string().optional()
});

export const StepsBlockSchema = z.strictObject({
  ...BlockBaseShape,
  type: z.literal("steps"),
  steps: z.array(z.strictObject({
    id: z.string().min(1),
    label: z.string().min(1),
    detail: z.string().optional(),
    state: z.enum(["pending", "current", "done", "blocked"])
  })).max(12)
});

export const ChecklistBlockSchema = z.strictObject({
  ...BlockBaseShape,
  type: z.literal("checklist"),
  items: z.array(z.strictObject({
    id: z.string().min(1),
    label: z.string().min(1),
    detail: z.string().optional(),
    state: z.enum(["pending", "done", "blocked"]),
    linkLabel: z.string().optional()
  })).max(16)
});

export const ProgressBlockSchema = z.strictObject({
  ...BlockBaseShape,
  type: z.literal("progress"),
  value: z.number().min(0),
  max: z.number().positive(),
  label: z.string().min(1),
  detail: z.string().optional()
}).refine((block) => block.value <= block.max, {
  message: "Progress value cannot exceed max",
  path: ["value"]
});

export const DraftBlockSchema = z.strictObject({
  ...BlockBaseShape,
  type: z.literal("draft"),
  channel: z.enum(["email", "sms", "message"]),
  recipientLabel: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().max(10_000),
  editable: z.boolean(),
  providerState: z.enum([
    "dashboard_only",
    "creating",
    "provider_ready",
    "changed_externally",
    "send_scheduled",
    "sent",
    "failed"
  ])
});

export const DayStripBlockSchema = z.strictObject({
  ...BlockBaseShape,
  type: z.literal("day_strip"),
  days: z.array(z.strictObject({
    label: z.string().min(1),
    date: z.string().min(1),
    slots: z.array(z.string())
  })).max(7),
  proposedSlotId: z.string().optional()
});

export const KeyValueBlockSchema = z.strictObject({
  ...BlockBaseShape,
  type: z.literal("key_value"),
  entries: z.array(z.strictObject({
    label: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean()]),
    emphasis: z.boolean().optional()
  })).max(16)
});

export const KnownItemBlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  QuoteBlockSchema,
  CalloutBlockSchema,
  ComparisonTableBlockSchema,
  SlotsBlockSchema,
  StepsBlockSchema,
  ChecklistBlockSchema,
  ProgressBlockSchema,
  DraftBlockSchema,
  DayStripBlockSchema,
  KeyValueBlockSchema
]);

export const FallbackBlockSchema = z.strictObject({
  id: z.string().min(1).max(100),
  type: z.literal("fallback"),
  schemaVersion: z.literal(1),
  fallbackText: z.string().min(1).max(800),
  originalType: z.string().min(1),
  reason: z.enum(["unknown", "malformed"])
});

export const ItemBlockSchema = z.union([KnownItemBlockSchema, FallbackBlockSchema]);

export const SpineSchema = z.strictObject({
  titleLead: z.string().min(1).max(100),
  situation: z.string().min(1).max(320),
  recommendation: z.string().max(500).nullable(),
  stateLabel: z.string().min(1).max(50),
  sourceLabel: z.string().max(100).nullable(),
  sourceTime: z.string().max(100).nullable(),
  provenance: z.strictObject({
    kind: z.enum([
      "email",
      "calendar",
      "message",
      "chat",
      "user_request",
      "operator",
      "project",
      "manual"
    ]),
    label: z.string().max(220),
    quote: z.string().max(700).optional(),
    sourcesRead: z.number().int().nonnegative().optional(),
    confidence: z.enum(["explicit", "strong", "inferred"]).optional()
  }).optional()
});

const ItemDocumentEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  spine: SpineSchema,
  blocks: z.array(z.unknown()).max(12),
  actionIds: z.array(UuidSchema).max(4),
  ask: z.strictObject({
    enabled: z.literal(true),
    placeholder: z.string().max(160).optional()
  })
});

export const ItemDocumentV1Schema = ItemDocumentEnvelopeSchema.transform((document) => ({
  ...document,
  blocks: document.blocks.map(parseItemBlock)
}));

export const QueueItemAskInputSchema = z.strictObject({
  itemId: UuidSchema,
  instruction: AskInstructionSchema
});

export const QueueGlobalAskInputSchema = z.strictObject({
  workspaceId: UuidSchema,
  instruction: AskInstructionSchema
});

export const CancelAiJobInputSchema = z.strictObject({
  jobId: UuidSchema
});

export const AppendItemRevisionInputSchema = z.strictObject({
  itemId: UuidSchema,
  expectedVersion: z.number().int().positive(),
  expectedRevisionId: UuidSchema,
  document: ItemDocumentV1Schema,
  sourceRefIds: z.array(UuidSchema).max(32).refine(
    (sourceRefIds) => new Set(sourceRefIds).size === sourceRefIds.length,
    { message: "Source reference IDs must be unique" }
  ).default([])
});

export const ItemRevisionReceiptSchema = z.strictObject({
  revisionId: UuidSchema,
  newVersion: z.number().int().positive()
});

export const AiJobSchema = z.strictObject({
  id: UuidSchema,
  workspaceId: UuidSchema,
  itemId: UuidSchema.nullable(),
  requestedByUserId: UuidSchema.nullable(),
  instruction: AskInstructionSchema,
  origin: AiJobOriginSchema,
  priority: z.number().int().min(0).max(100),
  status: AiJobStatusSchema,
  queuedFor: DateTimeSchema,
  resultSummary: z.string().max(2000).nullable(),
  resultPayload: z.record(z.string(), z.unknown()),
  attemptCount: z.number().int().nonnegative(),
  createdAt: DateTimeSchema,
  startedAt: DateTimeSchema.nullable(),
  completedAt: DateTimeSchema.nullable()
});

export const SourceHealthSchema = z.strictObject({
  id: UuidSchema,
  workspaceId: UuidSchema,
  sourceKey: z.string().min(1).max(120),
  label: z.string().min(1).max(160),
  status: SourceHealthStatusSchema,
  message: z.string().max(500).nullable(),
  lastSuccessAt: DateTimeSchema.nullable(),
  lastCheckedAt: DateTimeSchema,
  nextExpectedAt: DateTimeSchema.nullable(),
  metadata: z.record(z.string(), z.unknown())
});

export const CapabilitySchema = z.enum(capabilityValues);

export const ActionSchema = z.strictObject({
  id: UuidSchema,
  itemId: UuidSchema,
  itemRevisionId: UuidSchema,
  kind: z.enum(["internal", "ai", "external", "hybrid"]),
  capability: CapabilitySchema,
  label: z.string().min(1).max(100),
  recommended: z.boolean(),
  visualTone: z.enum(["ink", "fjord", "outline", "link"]),
  consequence: z.string().max(300).nullable().optional(),
  effectPlan: z.record(z.string(), z.unknown()).optional(),
  payload: z.record(z.string(), z.unknown()),
  riskLevel: z.enum([
    "internal",
    "external_reversible",
    "external_irreversible",
    "prohibited"
  ]),
  status: z.enum([
    "proposed",
    "approved",
    "prepared",
    "scheduled",
    "executing",
    "succeeded",
    "failed",
    "cancelled",
    "expired"
  ]),
  allowStaleExecution: z.boolean().optional().default(false),
  executeAfter: DateTimeSchema.nullable().optional(),
  expiresAt: DateTimeSchema.nullable().optional()
}).superRefine((action, context) => {
  const policy = capabilityPolicies[action.capability];

  if (action.kind !== policy.kind) {
    context.addIssue({
      code: "custom",
      message: `Capability ${action.capability} must use action kind ${policy.kind}`,
      path: ["kind"]
    });
  }

  if (action.riskLevel !== policy.risk) {
    context.addIssue({
      code: "custom",
      message: `Capability ${action.capability} must use risk level ${policy.risk}`,
      path: ["riskLevel"]
    });
  }
});

export const ItemFixtureSchema = z.strictObject({
  item: ItemEnvelopeSchema,
  document: ItemDocumentV1Schema,
  actions: z.array(ActionSchema).max(4)
}).superRefine((fixture, context) => {
  const actionIds = new Set(fixture.actions.map((action) => action.id));
  const recommendedCount = fixture.actions.filter((action) => action.recommended).length;

  for (const actionId of fixture.document.actionIds) {
    if (!actionIds.has(actionId)) {
      context.addIssue({
        code: "custom",
        message: `Document refers to missing action ${actionId}`,
        path: ["document", "actionIds"]
      });
    }
  }

  if (fixture.actions.length > 0 && recommendedCount !== 1) {
    context.addIssue({
      code: "custom",
      message: "Actionable fixtures require exactly one recommended action",
      path: ["actions"]
    });
  }

  for (const action of fixture.actions) {
    if (action.itemId !== fixture.item.id) {
      context.addIssue({
        code: "custom",
        message: "Action item ID does not match fixture item",
        path: ["actions"]
      });
    }
    if (action.itemRevisionId !== fixture.item.currentRevisionId) {
      context.addIssue({
        code: "custom",
        message: "Action is not bound to the current fixture revision",
        path: ["actions"]
      });
    }
  }
});

function readFallbackFields(value: unknown): {
  id: string;
  originalType: string;
  fallbackText: string;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      id: "unrenderable-block",
      originalType: "unknown",
      fallbackText: "This content could not be displayed."
    };
  }

  const record = value as Record<string, unknown>;
  return {
    id: typeof record.id === "string" && record.id.length > 0
      ? record.id.slice(0, 100)
      : "unrenderable-block",
    originalType: typeof record.type === "string" && record.type.length > 0
      ? record.type
      : "unknown",
    fallbackText: typeof record.fallbackText === "string" && record.fallbackText.length > 0
      ? record.fallbackText.slice(0, 800)
      : "This content could not be displayed."
  };
}

export function parseItemBlock(value: unknown): z.infer<typeof ItemBlockSchema> {
  const parsed = KnownItemBlockSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  const fallback = readFallbackFields(value);
  const knownType = KnownItemBlockSchema.options.some((schema) => {
    const result = schema.shape.type.safeParse(fallback.originalType);
    return result.success;
  });

  return FallbackBlockSchema.parse({
    ...fallback,
    type: "fallback",
    schemaVersion: 1,
    reason: knownType ? "malformed" : "unknown"
  });
}

export type ItemState = z.infer<typeof ItemStateSchema>;
export type AttentionTier = z.infer<typeof AttentionTierSchema>;
export type ItemEnvelope = z.infer<typeof ItemEnvelopeSchema>;
export type AiJobOrigin = z.infer<typeof AiJobOriginSchema>;
export type AiJobStatus = z.infer<typeof AiJobStatusSchema>;
export type AiJob = z.infer<typeof AiJobSchema>;
export type SourceHealthStatus = z.infer<typeof SourceHealthStatusSchema>;
export type SourceHealth = z.infer<typeof SourceHealthSchema>;
export type QueueItemAskInput = z.infer<typeof QueueItemAskInputSchema>;
export type QueueGlobalAskInput = z.infer<typeof QueueGlobalAskInputSchema>;
export type CancelAiJobInput = z.infer<typeof CancelAiJobInputSchema>;
export type AppendItemRevisionInput = z.infer<typeof AppendItemRevisionInputSchema>;
export type ItemRevisionReceipt = z.infer<typeof ItemRevisionReceiptSchema>;
export type KnownItemBlock = z.infer<typeof KnownItemBlockSchema>;
export type ItemBlock = z.infer<typeof ItemBlockSchema>;
export type ItemDocumentV1 = z.infer<typeof ItemDocumentV1Schema>;
export type Action = z.infer<typeof ActionSchema>;
export type Capability = z.infer<typeof CapabilitySchema>;
export type ItemFixture = z.infer<typeof ItemFixtureSchema>;
