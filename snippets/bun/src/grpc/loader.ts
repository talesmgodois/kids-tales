import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const PROTO_PATH = path.join(import.meta.dir, "stories.proto");

// Single set of options shared by server and client so both parse the proto
// the same way (field names, long encoding, enum representation).
const PROTO_OPTIONS: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

const pkgDef = protoLoader.loadSync(PROTO_PATH, PROTO_OPTIONS);
const grpcObject = grpc.loadPackageDefinition(pkgDef);

// Typed constructor for StoriesService so neither server.ts nor client.ts
// need to cast through `any` just to access the service definition.
export const StoriesServiceDef = (
  (grpcObject.stories as grpc.GrpcObject).StoriesService as grpc.ServiceClientConstructor
);

// ── Shared channel options ────────────────────────────────────────────────
// Applied to both server and client to keep their transport settings aligned.

export const SERVER_OPTIONS: grpc.ServerOptions = {
  "grpc.max_send_message_length":    4 * 1024 * 1024, // 4 MB
  "grpc.max_receive_message_length": 4 * 1024 * 1024,
  "grpc.keepalive_time_ms":          20_000,
  "grpc.keepalive_timeout_ms":        5_000,
};

export const CHANNEL_OPTIONS: grpc.ChannelOptions = {
  "grpc.max_send_message_length":          4 * 1024 * 1024,
  "grpc.max_receive_message_length":       4 * 1024 * 1024,
  "grpc.keepalive_time_ms":               20_000,
  "grpc.keepalive_timeout_ms":             5_000,
  "grpc.keepalive_permit_without_calls":       1,
  "grpc.http2.min_time_between_pings_ms": 10_000,
};
