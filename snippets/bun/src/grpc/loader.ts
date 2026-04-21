import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const PROTO_PATH = path.join(import.meta.dir, "stories.proto");

const PROTO_OPTIONS: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

const packageDef = protoLoader.loadSync(PROTO_PATH, PROTO_OPTIONS);
const grpcObject = grpc.loadPackageDefinition(packageDef);

export const StoriesServiceDef = (
  (grpcObject.stories as grpc.GrpcObject).StoriesService as grpc.ServiceClientConstructor
);
