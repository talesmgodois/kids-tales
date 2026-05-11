import * as flexbuffers from "flatbuffers/js/flexbuffers.js";

type TsbrPackedValue = Uint8Array;

interface TsbrRuntimeState {
  baseUrl: string;
  endpoint: string;
  defaultHeaders?: HeadersInit;
  fetchImpl: typeof fetch;
}

export interface TsbrConfigureOptions {
  baseUrl: string;
  endpoint?: string;
  headers?: HeadersInit;
  fetchImpl?: typeof fetch;
}

export interface TsbrRequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
}

function normalizeBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }

  return new Uint8Array(input);
}

function base64FromBytes(input: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength).toString("base64");
  }

  let binary = "";
  for (const value of input) {
    binary += String.fromCharCode(value);
  }

  return btoa(binary);
}

function joinUrl(baseUrl: string, endpoint: string): string {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

const state: TsbrRuntimeState = {
  baseUrl: "",
  endpoint: "/tsbr",
  fetchImpl: fetch,
};

function makeHeaders(
  sid: number,
  mid: number,
  requestHeaders?: HeadersInit,
  streamArgs?: unknown[],
): Headers {
  const headers = new Headers(state.defaultHeaders);
  headers.set("content-type", "application/octet-stream");
  headers.set("accept", "application/octet-stream");
  headers.set("xts", String(sid));
  headers.set("xtm", String(mid));

  if (streamArgs) {
    headers.set("xta", base64FromBytes(tsbr.pack(streamArgs)));
  }

  if (requestHeaders) {
    const incoming = new Headers(requestHeaders);
    incoming.forEach((value, key) => headers.set(key, value));
  }

  return headers;
}

async function readBinaryResponse(response: Response): Promise<Uint8Array> {
  const raw = new Uint8Array(await response.arrayBuffer());

  if (!response.ok) {
    const details = tsbr.unpack(raw) as Record<string, unknown> | undefined;
    const reason = details?.error ?? `${response.status} ${response.statusText}`;
    throw new Error(`TSBR request failed: ${String(reason)}`);
  }

  return raw;
}

export const tsbr = {
  configure(options: TsbrConfigureOptions) {
    state.baseUrl = options.baseUrl;
    state.endpoint = options.endpoint ?? state.endpoint;
    state.defaultHeaders = options.headers;
    state.fetchImpl = options.fetchImpl ?? fetch;
  },

  pack(value: unknown): TsbrPackedValue {
    return flexbuffers.encode(value);
  },

  unpack<T = unknown>(buffer: ArrayBuffer | Uint8Array): T {
    const normalized = normalizeBytes(buffer);
    const payload = normalized.buffer.slice(
      normalized.byteOffset,
      normalized.byteOffset + normalized.byteLength,
    );
    return flexbuffers.toObject(payload) as T;
  },

  async call<T = unknown>(
    sid: number,
    mid: number,
    args: unknown[] = [],
    options?: TsbrRequestOptions,
  ): Promise<T> {
    const endpoint = joinUrl(state.baseUrl, state.endpoint);
    const response = await state.fetchImpl(endpoint, {
      method: "POST",
      body: tsbr.pack(args),
      signal: options?.signal,
      headers: makeHeaders(sid, mid, options?.headers),
    });

    const payload = await readBinaryResponse(response);
    return tsbr.unpack<T>(payload);
  },

  async streamCall<T = unknown>(
    sid: number,
    mid: number,
    extraArgs: unknown[],
    stream: ReadableStream<Uint8Array>,
    options?: TsbrRequestOptions,
  ): Promise<T> {
    const endpoint = joinUrl(state.baseUrl, state.endpoint);
    const requestInit = {
      method: "POST",
      body: stream,
      signal: options?.signal,
      headers: makeHeaders(sid, mid, options?.headers, extraArgs),
      duplex: "half",
    } as RequestInit & { duplex: "half" };

    const response = await state.fetchImpl(endpoint, requestInit);
    const payload = await readBinaryResponse(response);
    return tsbr.unpack<T>(payload);
  },
};
