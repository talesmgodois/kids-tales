export type TsbrBinaryPayload = Uint8Array;

export type TsbrRouteHandler = (
  payload: TsbrBinaryPayload,
  request: Request,
) => Promise<TsbrBinaryPayload> | TsbrBinaryPayload;

export interface TsbrServeOptions {
  port?: number;
  routes: Record<string, TsbrRouteHandler>;
  onError?: (error: unknown, request: Request) => TsbrBinaryPayload;
}

export interface TsbrClientRouteDefinition {
  method?: string;
  path: string;
}

export interface TsbrClientCallOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
}

export type TsbrClientMap<TRoutes extends Record<string, TsbrClientRouteDefinition>> = {
  [K in keyof TRoutes]: (
    payload: TsbrBinaryPayload,
    options?: TsbrClientCallOptions,
  ) => Promise<TsbrBinaryPayload>;
};

function parseRouteKey(routeKey: string): { method: string; path: string } {
  const [methodCandidate, ...pathParts] = routeKey.trim().split(/\s+/);

  if (!methodCandidate || pathParts.length === 0) {
    throw new Error(
      `Invalid route key "${routeKey}". Use "METHOD /path", e.g. "POST /books".`,
    );
  }

  return {
    method: methodCandidate.toUpperCase(),
    path: pathParts.join(" "),
  };
}

function uint8ArrayFrom(input: ArrayBuffer): TsbrBinaryPayload {
  return new Uint8Array(input);
}

function binaryResponse(payload: TsbrBinaryPayload, status = 200): Response {
  return new Response(payload, {
    status,
    headers: {
      "content-type": "application/octet-stream",
    },
  });
}

export function serve(options: TsbrServeOptions) {
  const routes = new Map<string, TsbrRouteHandler>();

  for (const [routeKey, handler] of Object.entries(options.routes)) {
    const { method, path } = parseRouteKey(routeKey);
    routes.set(`${method}:${path}`, handler);
  }

  return Bun.serve({
    port: options.port ?? Number(process.env.PORT ?? 3000),
    async fetch(request) {
      const url = new URL(request.url);
      const route = routes.get(`${request.method.toUpperCase()}:${url.pathname}`);

      if (!route) {
        return new Response("Not Found", { status: 404 });
      }

      try {
        const payload = uint8ArrayFrom(await request.arrayBuffer());
        const responsePayload = await route(payload, request);
        return binaryResponse(responsePayload);
      } catch (error) {
        if (options.onError) {
          return binaryResponse(options.onError(error, request), 500);
        }

        return new Response("Internal Server Error", { status: 500 });
      }
    },
  });
}

export function genClients<TRoutes extends Record<string, TsbrClientRouteDefinition>>(
  baseUrl: string,
  routes: TRoutes,
): TsbrClientMap<TRoutes> {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const clients = {} as TsbrClientMap<TRoutes>;

  for (const [name, routeDefinition] of Object.entries(routes) as [
    keyof TRoutes,
    TRoutes[keyof TRoutes],
  ][]) {
    clients[name] = (async (
      payload: TsbrBinaryPayload,
      callOptions?: TsbrClientCallOptions,
    ) => {
      const routeMethod = routeDefinition.method?.toUpperCase() ?? "POST";
      const headers = new Headers(callOptions?.headers);
      headers.set("accept", "application/octet-stream");
      headers.set("content-type", "application/octet-stream");

      const response = await fetch(`${base}${routeDefinition.path}`, {
        method: routeMethod,
        body: payload,
        signal: callOptions?.signal,
        headers,
      });

      if (!response.ok) {
        throw new Error(
          `TSBR request failed (${routeMethod} ${routeDefinition.path}): ${response.status} ${response.statusText}`,
        );
      }

      return uint8ArrayFrom(await response.arrayBuffer());
    }) as TsbrClientMap<TRoutes>[typeof name];
  }

  return clients;
}
