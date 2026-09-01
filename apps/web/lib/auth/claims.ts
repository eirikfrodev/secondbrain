import { z } from "zod";

const ClaimsResultSchema = z.looseObject({
  data: z.looseObject({ claims: z.unknown() }).nullable(),
  error: z.unknown().nullable()
});

const AuthenticationMethodSchema = z.union([
  z.string(),
  z.looseObject({ method: z.string() })
]);

const VerifiedClaimsSchema = z.looseObject({
  sub: z.string().uuid(),
  iss: z.url(),
  aud: z.union([
    z.literal("authenticated"),
    z.array(z.string()).refine((audience) => audience.includes("authenticated"))
  ]),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  role: z.literal("authenticated"),
  aal: z.enum(["aal1", "aal2"]),
  session_id: z.string().uuid(),
  is_anonymous: z.literal(false),
  app_metadata: z.looseObject({
    provider: z.literal("google"),
    providers: z.array(z.string()).refine((providers) => providers.includes("google"))
  }),
  amr: z.array(AuthenticationMethodSchema).refine((methods) =>
    methods.some((method) =>
      typeof method === "string" ? method === "oauth" : method.method === "oauth"
    )
  )
});

export type VerifiedSession = {
  userId: string;
};

export interface ClaimsProvider {
  getClaims(): Promise<unknown>;
}

export function parseVerifiedSession(
  result: unknown,
  supabaseUrl: string
): VerifiedSession | null {
  const parsedResult = ClaimsResultSchema.safeParse(result);

  if (
    !parsedResult.success ||
    parsedResult.data.error !== null ||
    parsedResult.data.data === null
  ) {
    return null;
  }

  const claims = VerifiedClaimsSchema.safeParse(parsedResult.data.data.claims);

  if (
    !claims.success ||
    claims.data.iss !== `${supabaseUrl.replace(/\/$/, "")}/auth/v1`
  ) {
    return null;
  }

  return { userId: claims.data.sub };
}

export async function readVerifiedSession(
  provider: ClaimsProvider,
  supabaseUrl: string
): Promise<VerifiedSession | null> {
  try {
    return parseVerifiedSession(await provider.getClaims(), supabaseUrl);
  } catch {
    return null;
  }
}
