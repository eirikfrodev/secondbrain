import { describe, expect, it, vi } from "vitest";

import {
  apiErrorResponse,
  apiJsonResponse,
  readJsonMutationBody,
  requireEmptyMutationBody,
  validateMutationRequest
} from "./browser-mutation";

const AppOrigin = "https://utsikt.test";
const AskPath = "/api/ask";
const MaximumBodyBytes = 16 * 1_024;

type StreamRequestInit = RequestInit & { duplex: "half" };

function mutationHeaders(overrides: HeadersInit = {}): Headers {
  const headers = new Headers({
    Origin: AppOrigin,
    "Sec-Fetch-Site": "same-origin"
  });

  new Headers(overrides).forEach((value, key) => {
    headers.set(key, value);
  });

  return headers;
}

function mutationRequest(
  path = AskPath,
  init: RequestInit = {}
): Request {
  return new Request(`${AppOrigin}${path}`, {
    method: "POST",
    ...init,
    headers: mutationHeaders(init.headers)
  });
}

function jsonRequest(body: BodyInit, headers: HeadersInit = {}): Request {
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("content-type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return mutationRequest(AskPath, {
    body,
    headers: requestHeaders
  });
}

function streamRequest(
  body: ReadableStream<Uint8Array>,
  headers: HeadersInit
): Request {
  const init: StreamRequestInit = {
    method: "POST",
    headers,
    body,
    duplex: "half"
  };

  return new Request(`${AppOrigin}${AskPath}`, init);
}

async function expectInvalidRequest(response: Response | null): Promise<void> {
  expect(response?.status).toBe(400);
  await expect(response?.json()).resolves.toEqual({
    error: { code: "invalid_request", message: "Invalid request." }
  });
}

function expectProtectedResponseHeaders(response: Response): void {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0"
  );
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("expires")).toBe("0");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("vary")).toBe("Cookie, Origin");
  expect(response.headers.has("access-control-allow-origin")).toBe(false);
}

describe("browser mutation responses", () => {
  it("returns JSON payloads with defensive cache and content headers", async () => {
    const response = apiJsonResponse({ accepted: true }, 201);

    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toContain("application/json");
    expectProtectedResponseHeaders(response);
    await expect(response.json()).resolves.toEqual({ accepted: true });
  });

  it("uses the stable nested error envelope", async () => {
    const response = apiErrorResponse(409, "invalid_state", "Invalid state.");

    expect(response.status).toBe(409);
    expectProtectedResponseHeaders(response);
    await expect(response.json()).resolves.toEqual({
      error: { code: "invalid_state", message: "Invalid state." }
    });
  });
});

describe("mutation request validation", () => {
  it("accepts only the exact same-origin POST target", () => {
    expect(validateMutationRequest(mutationRequest(), AppOrigin, AskPath)).toBeNull();
  });

  it.each([
    ["wrong method", mutationRequest(AskPath, { method: "PUT" })],
    ["wrong request origin", new Request("https://evil.test/api/ask", {
      method: "POST",
      headers: mutationHeaders()
    })],
    ["wrong path", mutationRequest("/api/other")],
    ["query string", mutationRequest("/api/ask?retry=true")],
    ["empty query delimiter", mutationRequest("/api/ask?")],
    ["hash", mutationRequest("/api/ask#fragment")],
    ["empty hash delimiter", mutationRequest("/api/ask#")],
    ["missing Origin", new Request(`${AppOrigin}${AskPath}`, {
      method: "POST",
      headers: { "Sec-Fetch-Site": "same-origin" }
    })],
    ["wrong Origin", mutationRequest(AskPath, {
      headers: { Origin: "https://evil.test" }
    })],
    ["missing Sec-Fetch-Site", new Request(`${AppOrigin}${AskPath}`, {
      method: "POST",
      headers: { Origin: AppOrigin }
    })],
    ["cross-site Sec-Fetch-Site", mutationRequest(AskPath, {
      headers: { "Sec-Fetch-Site": "cross-site" }
    })]
  ])("rejects a %s with one stable response", async (_label, request) => {
    const response = validateMutationRequest(request, AppOrigin, AskPath);

    await expectInvalidRequest(response);
    if (response !== null) {
      expectProtectedResponseHeaders(response);
    }
  });

  it("rejects URL credentials even when the remaining target is exact", async () => {
    const request = {
      method: "POST",
      url: "https://user:password@utsikt.test/api/ask",
      headers: mutationHeaders()
    } as Request;

    await expectInvalidRequest(
      validateMutationRequest(request, AppOrigin, AskPath)
    );
  });

  it.each([
    "https://utsikt.test/",
    "https://utsikt.test/path",
    "https://user:password@utsikt.test",
    "not-a-url"
  ])("rejects a non-canonical application origin %s", async (appOrigin) => {
    await expectInvalidRequest(
      validateMutationRequest(mutationRequest(), appOrigin, AskPath)
    );
  });
});

describe("JSON mutation bodies", () => {
  it.each([
    "application/json",
    "application/json; charset=utf-8",
    "APPLICATION/JSON ; CHARSET=UTF-8",
    'application/json;charset="utf-8"'
  ])("accepts %s and returns parsed unknown data", async (contentType) => {
    const request = jsonRequest(JSON.stringify({ instruction: "Review this" }), {
      "Content-Type": contentType
    });

    const result = await readJsonMutationBody(request);

    expect(result).toEqual({ data: { instruction: "Review this" } });
  });

  it.each([
    ["missing Content-Type", {}],
    ["wrong media type", { "Content-Type": "text/plain" }],
    ["wrong charset", { "Content-Type": "application/json; charset=utf-16" }],
    ["extra parameter", { "Content-Type": "application/json; charset=utf-8; version=1" }],
    ["Content-Encoding", {
      "Content-Type": "application/json",
      "Content-Encoding": "identity"
    }]
  ])("rejects %s as unsupported media", async (_label, headers) => {
    const request = mutationRequest(AskPath, {
      body: new TextEncoder().encode("{}"),
      headers
    });
    const result = await readJsonMutationBody(request);

    expect(result.response?.status).toBe(415);
    await expect(result.response?.json()).resolves.toEqual({
      error: {
        code: "unsupported_media_type",
        message: "Unsupported media type."
      }
    });
  });

  it("rejects a declared oversized body before opening its stream", async () => {
    const getReader = vi.fn(() => {
      throw new Error("must not read");
    });
    const request = {
      headers: new Headers({
        "Content-Type": "application/json",
        "Content-Length": String(MaximumBodyBytes + 1)
      }),
      body: { getReader }
    } as unknown as Request;

    const result = await readJsonMutationBody(request);

    expect(result.response?.status).toBe(413);
    expect(getReader).not.toHaveBeenCalled();
  });

  it("accepts a valid JSON body at exactly the 16 KiB limit", async () => {
    const body = JSON.stringify("a".repeat(MaximumBodyBytes - 2));
    expect(new TextEncoder().encode(body)).toHaveLength(MaximumBodyBytes);
    const result = await readJsonMutationBody(jsonRequest(body, {
      "Content-Length": String(MaximumBodyBytes)
    }));

    expect(result).toEqual({ data: "a".repeat(MaximumBodyBytes - 2) });
  });

  it("enforces the cumulative cap when Content-Length is absent", async () => {
    const request = jsonRequest(
      new Uint8Array(MaximumBodyBytes + 1).fill(0x20)
    );
    const result = await readJsonMutationBody(request);

    expect(result.response?.status).toBe(413);
    await expect(result.response?.json()).resolves.toEqual({
      error: {
        code: "payload_too_large",
        message: "Request body too large."
      }
    });
  });

  it.each(["-1", "1e3", "1, 1", "not-a-number"])(
    "rejects malformed Content-Length %s",
    async (contentLength) => {
      const result = await readJsonMutationBody(jsonRequest("{}", {
        "Content-Length": contentLength
      }));

      await expectInvalidRequest(result.response ?? null);
    }
  );

  it("rejects invalid UTF-8 without replacement decoding", async () => {
    const result = await readJsonMutationBody(
      jsonRequest(new Uint8Array([0xc3, 0x28]))
    );

    await expectInvalidRequest(result.response ?? null);
  });

  it.each(["", "{", "undefined"])(
    "rejects malformed JSON %j",
    async (body) => {
      const result = await readJsonMutationBody(jsonRequest(body));

      await expectInvalidRequest(result.response ?? null);
    }
  );

  it("maps body stream failures to the stable invalid-request response", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("sensitive stream failure"));
      }
    });
    const request = streamRequest(body, {
      "Content-Type": "application/json"
    });
    const result = await readJsonMutationBody(request);

    await expectInvalidRequest(result.response ?? null);
  });

  it("does not call Request.json", async () => {
    const request = jsonRequest('{"accepted":true}');
    const json = vi.spyOn(request, "json").mockRejectedValue(
      new Error("Request.json must not be used")
    );

    const result = await readJsonMutationBody(request);

    expect(result).toEqual({ data: { accepted: true } });
    expect(json).not.toHaveBeenCalled();
  });
});

describe("empty cancellation bodies", () => {
  it("accepts an absent body and body metadata", async () => {
    await expect(requireEmptyMutationBody(mutationRequest())).resolves.toBeNull();
  });

  it("accepts an explicit zero Content-Length", async () => {
    const request = mutationRequest(AskPath, {
      headers: { "Content-Length": "0" }
    });

    await expect(requireEmptyMutationBody(request)).resolves.toBeNull();
  });

  it.each([
    ["Content-Type", { "Content-Type": "application/json" }],
    ["Content-Encoding", { "Content-Encoding": "identity" }]
  ])("rejects an otherwise empty body with %s", async (_label, headers) => {
    const response = await requireEmptyMutationBody(
      mutationRequest(AskPath, { headers })
    );

    expect(response?.status).toBe(415);
  });

  it("rejects a declared non-empty body before reading", async () => {
    const getReader = vi.fn(() => {
      throw new Error("must not read");
    });
    const request = {
      headers: new Headers({ "Content-Length": "1" }),
      body: { getReader }
    } as unknown as Request;

    const response = await requireEmptyMutationBody(request);

    await expectInvalidRequest(response);
    expect(getReader).not.toHaveBeenCalled();
  });

  it("rejects undeclared body bytes", async () => {
    const request = mutationRequest(AskPath, {
      body: new Uint8Array([0x7b])
    });

    await expectInvalidRequest(await requireEmptyMutationBody(request));
  });

  it("returns payload-too-large for a declared oversized body", async () => {
    const request = {
      headers: new Headers({
        "Content-Length": String(MaximumBodyBytes + 1)
      }),
      body: null
    } as unknown as Request;

    const response = await requireEmptyMutationBody(request);

    expect(response?.status).toBe(413);
  });

  it("enforces the cumulative cap on an undeclared oversized body", async () => {
    const request = mutationRequest(AskPath, {
      body: new Uint8Array(MaximumBodyBytes + 1)
    });
    const response = await requireEmptyMutationBody(request);

    expect(response?.status).toBe(413);
  });
});
