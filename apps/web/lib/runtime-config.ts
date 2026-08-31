import { z } from "zod";

const ConnectorModeSchema = z.enum(["mock", "supabase"]);
const SupabaseUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
});
const PublishableKeySchema = z.string().regex(/^sb_publishable_[A-Za-z0-9_-]+$/);

export type RuntimeConfig =
  | { mode: "mock" }
  | {
      mode: "supabase";
      supabaseUrl: string;
      publishableKey: string;
    };

export type PublicRuntimeEnvironment = {
  connectorMode?: string;
  supabaseUrl?: string;
  publishableKey?: string;
};

export type ServerRuntimeEnvironment = PublicRuntimeEnvironment & {
  serverConnectorMode?: string;
};

export class RuntimeConfigurationError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "RuntimeConfigurationError";
  }
}

function optionalValue(value: string | undefined): string | undefined {
  return value === undefined || value.length === 0 ? undefined : value;
}

function parseOptionalMode(value: string | undefined): "mock" | "supabase" | undefined {
  const normalized = optionalValue(value);

  if (normalized === undefined) {
    return undefined;
  }

  try {
    return ConnectorModeSchema.parse(normalized);
  } catch (cause) {
    throw new RuntimeConfigurationError(
      "Connector mode must be either mock or supabase.",
      cause
    );
  }
}

function validatePresentPublishableKey(value: string | undefined): string | undefined {
  const normalized = optionalValue(value);

  if (normalized === undefined) {
    return undefined;
  }

  try {
    return PublishableKeySchema.parse(normalized);
  } catch (cause) {
    throw new RuntimeConfigurationError(
      "The public Supabase key must use the sb_publishable_ format.",
      cause
    );
  }
}

function parseSupabaseConfig(environment: PublicRuntimeEnvironment): RuntimeConfig {
  try {
    return {
      mode: "supabase",
      supabaseUrl: SupabaseUrlSchema.parse(optionalValue(environment.supabaseUrl)),
      publishableKey: PublishableKeySchema.parse(
        validatePresentPublishableKey(environment.publishableKey)
      )
    };
  } catch (cause) {
    throw new RuntimeConfigurationError(
      "Supabase mode requires a valid public URL and publishable key.",
      cause
    );
  }
}

export function resolvePublicRuntimeConfig(
  environment: PublicRuntimeEnvironment
): RuntimeConfig {
  validatePresentPublishableKey(environment.publishableKey);
  const mode = parseOptionalMode(environment.connectorMode) ?? "mock";
  return mode === "mock" ? { mode } : parseSupabaseConfig(environment);
}

export function resolveServerRuntimeConfig(
  environment: ServerRuntimeEnvironment
): RuntimeConfig {
  validatePresentPublishableKey(environment.publishableKey);
  const serverMode = parseOptionalMode(environment.serverConnectorMode);
  const publicMode = parseOptionalMode(environment.connectorMode);

  if (serverMode !== undefined && publicMode !== undefined && serverMode !== publicMode) {
    throw new RuntimeConfigurationError(
      "Server and browser connector modes must match."
    );
  }

  const mode = serverMode ?? publicMode ?? "mock";

  if (
    mode === "supabase" &&
    (serverMode !== "supabase" || publicMode !== "supabase")
  ) {
    throw new RuntimeConfigurationError(
      "Supabase mode must be enabled explicitly for both server and browser."
    );
  }

  return mode === "mock" ? { mode } : parseSupabaseConfig(environment);
}
