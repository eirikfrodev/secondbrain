import { NextResponse } from "next/server";

const MaximumMutationBodyBytes = 16 * 1_024;
const MaximumMutationBodyBytesBigInt = BigInt(MaximumMutationBodyBytes);
const JsonContentTypePattern =
  /^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/i;

const InvalidRequest = {
  status: 400,
  code: "invalid_request",
  message: "Invalid request."
} as const;

const UnsupportedMediaType = {
  status: 415,
  code: "unsupported_media_type",
  message: "Unsupported media type."
} as const;

const PayloadTooLarge = {
  status: 413,
  code: "payload_too_large",
  message: "Request body too large."
} as const;

type JsonMutationBodyResult =
  | { data: unknown; response?: never }
  | { response: NextResponse; data?: never };

type BoundedBodyResult =
  | { bytes: Uint8Array; response?: never }
  | { response: NextResponse; bytes?: never };

function mutationResponseHeaders(): Headers {
  return new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
    Vary: "Cookie, Origin",
    "X-Content-Type-Options": "nosniff"
  });
}

function invalidRequestResponse(): NextResponse {
  return apiErrorResponse(
    InvalidRequest.status,
    InvalidRequest.code,
    InvalidRequest.message
  );
}

function unsupportedMediaTypeResponse(): NextResponse {
  return apiErrorResponse(
    UnsupportedMediaType.status,
    UnsupportedMediaType.code,
    UnsupportedMediaType.message
  );
}

function payloadTooLargeResponse(): NextResponse {
  return apiErrorResponse(
    PayloadTooLarge.status,
    PayloadTooLarge.code,
    PayloadTooLarge.message
  );
}

function validateContentLength(request: Request): NextResponse | null {
  const contentLength = request.headers.get("content-length");

  if (contentLength === null) {
    return null;
  }

  if (!/^\d+$/.test(contentLength)) {
    return invalidRequestResponse();
  }

  try {
    if (BigInt(contentLength) > MaximumMutationBodyBytesBigInt) {
      return payloadTooLargeResponse();
    }
  } catch {
    return invalidRequestResponse();
  }

  return null;
}

async function cancelReaderQuietly(
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<void> {
  try {
    await reader.cancel();
  } catch {
    // The stable HTTP response must not expose stream cancellation failures.
  }
}

async function readBoundedBody(request: Request): Promise<BoundedBodyResult> {
  const contentLengthFailure = validateContentLength(request);

  if (contentLengthFailure !== null) {
    return { response: contentLengthFailure };
  }

  if (request.body === null) {
    return { bytes: new Uint8Array() };
  }

  let reader: ReadableStreamDefaultReader<Uint8Array>;

  try {
    reader = request.body.getReader();
  } catch {
    return { response: invalidRequestResponse() };
  }

  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (value === undefined || value.byteLength === 0) {
        continue;
      }

      byteLength += value.byteLength;

      if (byteLength > MaximumMutationBodyBytes) {
        await cancelReaderQuietly(reader);
        return { response: payloadTooLargeResponse() };
      }

      chunks.push(value);
    }
  } catch {
    return { response: invalidRequestResponse() };
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // A disturbed stream is handled as an invalid request above.
    }
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { bytes };
}

export function apiJsonResponse(payload: unknown, status: number): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: mutationResponseHeaders()
  });
}

export function apiErrorResponse(
  status: number,
  code: string,
  message: string
): NextResponse {
  return apiJsonResponse({ error: { code, message } }, status);
}

export function validateMutationRequest(
  request: Request,
  appOrigin: string,
  expectedPath: string
): NextResponse | null {
  let applicationUrl: URL;
  let requestUrl: URL;

  try {
    applicationUrl = new URL(appOrigin);
    requestUrl = new URL(request.url);
  } catch {
    return invalidRequestResponse();
  }

  const hasCanonicalApplicationOrigin =
    appOrigin === applicationUrl.origin &&
    applicationUrl.pathname === "/" &&
    applicationUrl.search === "" &&
    applicationUrl.hash === "" &&
    applicationUrl.username === "" &&
    applicationUrl.password === "";
  const hasExactRequestTarget =
    requestUrl.href === `${applicationUrl.origin}${expectedPath}` &&
    requestUrl.origin === applicationUrl.origin &&
    requestUrl.pathname === expectedPath &&
    requestUrl.search === "" &&
    requestUrl.hash === "" &&
    requestUrl.username === "" &&
    requestUrl.password === "";

  if (
    request.method !== "POST" ||
    !hasCanonicalApplicationOrigin ||
    !hasExactRequestTarget ||
    request.headers.get("origin") !== applicationUrl.origin ||
    request.headers.get("sec-fetch-site") !== "same-origin"
  ) {
    return invalidRequestResponse();
  }

  return null;
}

export async function readJsonMutationBody(
  request: Request
): Promise<JsonMutationBodyResult> {
  const contentType = request.headers.get("content-type");

  if (
    request.headers.has("content-encoding") ||
    contentType === null ||
    !JsonContentTypePattern.test(contentType)
  ) {
    return { response: unsupportedMediaTypeResponse() };
  }

  const body = await readBoundedBody(request);

  if (body.response !== undefined) {
    return { response: body.response };
  }

  let text: string;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(body.bytes);
  } catch {
    return { response: invalidRequestResponse() };
  }

  try {
    return { data: JSON.parse(text) as unknown };
  } catch {
    return { response: invalidRequestResponse() };
  }
}

export async function requireEmptyMutationBody(
  request: Request
): Promise<NextResponse | null> {
  if (
    request.headers.has("content-type") ||
    request.headers.has("content-encoding")
  ) {
    return unsupportedMediaTypeResponse();
  }

  const contentLength = request.headers.get("content-length");
  const contentLengthFailure = validateContentLength(request);

  if (contentLengthFailure !== null) {
    return contentLengthFailure;
  }

  if (contentLength !== null && BigInt(contentLength) !== 0n) {
    return invalidRequestResponse();
  }

  const body = await readBoundedBody(request);

  if (body.response !== undefined) {
    return body.response;
  }

  return body.bytes.byteLength === 0 ? null : invalidRequestResponse();
}
