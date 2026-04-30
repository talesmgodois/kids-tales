import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import type { ProtoGrpcType } from "./generated/stories";

const PROTO_PATH = path.join(import.meta.dir, "stories.proto");

// Kept in sync with scripts/gen-proto.ts so the runtime and the generated
// types always interpret the proto the same way.
const PROTO_OPTIONS: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

const pkgDef = protoLoader.loadSync(PROTO_PATH, PROTO_OPTIONS);
const pkg = grpc.loadPackageDefinition(pkgDef) as unknown as ProtoGrpcType;

// Fully typed — no cast needed because ProtoGrpcType was generated from the proto.
export const StoriesServiceDef = pkg.stories.StoriesService;

// ── Shared channel options ────────────────────────────────────────────────

export const SERVER_OPTIONS: grpc.ServerOptions = {
  "grpc.max_send_message_length":    4 * 1024 * 1024,
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
