import * as flexbuffers from "flatbuffers/js/flexbuffers.js";
import { TSBR_MARKER_PROPERTY, type TsbrDecoratedPrototype } from "./decorators";

type ServiceInstance = Record<string, (...args: any[]) => unknown>;

interface RegisteredService {
  instance: ServiceInstance;
  methods: string[];
}

function toArrayBuffer(input: ArrayBuffer | SharedArrayBuffer | Uint8Array): ArrayBuffer {
  if (input instanceof Uint8Array) {
    const copied = new Uint8Array(input.byteLength);
    copied.set(input);
    return copied.buffer;
  }

  if (input instanceof ArrayBuffer) {
    return input;
  }

  const copied = new Uint8Array(input.byteLength);
  copied.set(new Uint8Array(input));
  return copied.buffer;
}

function decodeFlexBuffer(buffer: Uint8Array): unknown {
  return flexbuffers.toObject(toArrayBuffer(buffer));
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
  private readonly services: RegisteredService[] = [];

  register(instances: any[]) {
    const decorated = instances.filter((instance) => {
      const prototype = Object.getPrototypeOf(instance) as TsbrDecoratedPrototype;
      return prototype?.[TSBR_MARKER_PROPERTY] === true;
    });

    if (decorated.length !== instances.length) {
      const invalid = instances.find((instance) => {
        const prototype = Object.getPrototypeOf(instance) as TsbrDecoratedPrototype;
        return prototype?.[TSBR_MARKER_PROPERTY] !== true;
      });

      throw new Error(
        `TSBR service "${invalid?.constructor?.name ?? "Unknown"}" is missing @TSBR().`,
      );
    }

    const duplicatedNames = decorated
      .map((instance) => instance.constructor.name)
      .filter((name, index, all) => all.indexOf(name) !== index);

    if (duplicatedNames.length > 0) {
      throw new Error(
        `Duplicated TSBR service names found: ${Array.from(new Set(duplicatedNames)).join(", ")}`,
      );
    }

    const orderedInstances = [...decorated].sort((left, right) =>
      left.constructor.name.localeCompare(right.constructor.name),
    );

    this.services.length = 0;

    for (const instance of orderedInstances) {
      const prototype = Object.getPrototypeOf(instance) as TsbrDecoratedPrototype;
      const methods = Object.getOwnPropertyNames(prototype)
        .filter((name) => name !== "constructor" && typeof instance[name] === "function")
        .sort((left, right) => left.localeCompare(right));

      if (methods.length === 0) {
        throw new Error(`TSBR service "${instance.constructor.name}" has no public methods.`);
      }

      this.services.push({
        instance,
        methods,
      });
    }
  }

  serve(port: number) {
    return Bun.serve({
      port,
      fetch: async (request) => {
        const url = new URL(request.url);
        if (url.pathname !== "/tsbr") {
          return this.errorResponse(404, "TSBR endpoint not found.");
        }

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

        const service = this.services[sid];
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
          return new Response(toArrayBuffer(encodeFlexBuffer(result)), {
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
    return new Response(toArrayBuffer(encodeFlexBuffer({ error: message })), {
      status,
      headers: {
        "content-type": "application/octet-stream",
      },
    });
  }
}
