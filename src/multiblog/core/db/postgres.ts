import postgres, { type Sql } from "postgres";
import { createMultiblogConfigFromEnv } from "../config";

let sqlClient: Sql | null = null;

export function getPostgresClient(): Sql {
  if (sqlClient) {
    return sqlClient;
  }

  const config = createMultiblogConfigFromEnv();
  sqlClient = postgres(config.postgresUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
  });

  return sqlClient;
}

export async function closePostgresClient(): Promise<void> {
  if (!sqlClient) {
    return;
  }

  await sqlClient.end({ timeout: 5 });
  sqlClient = null;
}
