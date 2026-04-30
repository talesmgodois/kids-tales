#!/usr/bin/env bun
/**
 * Generates TypeScript types from every .proto file found under src/.
 * Run:  bun run generate:proto
 *
 * Options are kept in sync with the PROTO_OPTIONS in src/grpc/loader.ts so
 * that the generated types always match the runtime behaviour of proto-loader.
 */
import { $ } from "bun";
import { glob } from "glob";
import path from "path";

const ROOT   = path.resolve(import.meta.dir, "..");
const SRC    = path.join(ROOT, "src");
const OUTDIR = path.join(SRC, "grpc", "generated");

const protoFiles = await glob("**/*.proto", { cwd: SRC, absolute: true });

if (protoFiles.length === 0) {
  console.error("No .proto files found under src/");
  process.exit(1);
}

console.log(`Found ${protoFiles.length} proto file(s):`);
protoFiles.forEach((f) => console.log(`  ${path.relative(ROOT, f)}`));
console.log(`\nGenerating TypeScript → ${path.relative(ROOT, OUTDIR)}/\n`);

await $`bunx proto-loader-gen-types \
  --keepCase \
  --longs=String \
  --enums=String \
  --defaults \
  --oneofs \
  --grpcLib=@grpc/grpc-js \
  --outDir=${OUTDIR} \
  ${protoFiles}`;

console.log("\nDone.");
