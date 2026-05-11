import * as flexbuffers from "flatbuffers/js/flexbuffers.js";
import { TSBR_SID_PROPERTY, type TsbrDecoratedPrototype } from "./decorators";

type ServiceInstance = Record<string, (...args: any[]) => unknown>;

interface RegisteredService {
  instance: ServiceInstance;
  methods: string[];
}

function decodeFlexBuffer(buffer: Uint8Array): unknown {
  return flexbuffers.toObject(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

function encodeFlexBuffer(value: unknown): Uint8Array {
  return flexbuffers.encode(value);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = Buffer.from(value, "base64");
  return new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength);
}

function asArguments(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export class TSBRServer {
  private readonly services = new Map<number, RegisteredService>();

  register(instances: any[]) {
    for (const instance of instances) {
      const prototype = Object.getPrototypeOf(instance) as TsbrDecoratedPrototype;
      const sid = prototype?.[TSBR_SID_PROPERTY];

      if (typeof sid !== "number" || Number.isNaN(sid)) {
        throw new Error(
          `TSBR service "${instance?.constructor?.name ?? "Unknown"}" is missing @TSBR(sid).`,
        );
      }

      const methods = Object.getOwnPropertyNames(prototype)
        .filter((name) => name !== "constructor" && typeof instance[name] === "function")
        .sort((left, right) => left.localeCompare(right));

      if (methods.length === 0) {
        throw new Error(`TSBR service "${instance.constructor.name}" has no public methods.`);
      }

      this.services.set(sid, {
        instance,
        methods,
      });
    }
  }

  serve(port: number) {
    return Bun.serve({
      port,
      fetch: async (request) => {
        const sidHeader = request.headers.get("xts");
        const midHeader = request.headers.get("xtm");
        const argsHeader = request.headers.get("xta");

        if (!sidHeader || !midHeader) {
          return this.errorResponse(400, "Missing xts/xtm headers.");
        }

        const sid = Number.parseInt(sidHeader, 10);
        const mid = Number.parseInt(midHeader, 10);

        if (Number.isNaN(sid) || Number.isNaN(mid)) {
          return this.errorResponse(400, "Invalid xts/xtm headers.");
        }

        const service = this.services.get(sid);
        if (!service) {
          return this.errorResponse(404, `Service not found: sid=${sid}`);
        }

        const methodName = service.methods[mid];
        if (!methodName) {
          return this.errorResponse(404, `Method not found: sid=${sid}, mid=${mid}`);
        }

        const method = service.instance[methodName];

        try {
          let args: unknown[] = [];

          if (argsHeader && request.body) {
            const extraArgsRaw = decodeFlexBuffer(base64ToBytes(argsHeader));
            args = asArguments(extraArgsRaw);
            args.push(request.body);
          } else {
            const payload = new Uint8Array(await request.arrayBuffer());
            const bodyArgsRaw = payload.byteLength > 0 ? decodeFlexBuffer(payload) : [];
            args = asArguments(bodyArgsRaw);

            if (argsHeader) {
              args.push(...asArguments(decodeFlexBuffer(base64ToBytes(argsHeader))));
            }
          }

          const result = await method.apply(service.instance, args);
          return new Response(encodeFlexBuffer(result), {
            headers: {
              "content-type": "application/octet-stream",
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return this.errorResponse(500, message);
        }
      },
    });
  }

  private errorResponse(status: number, message: string): Response {
    return new Response(encodeFlexBuffer({ error: message }), {
      status,
      headers: {
        "content-type": "application/octet-stream",
      },
    });
  }
}
