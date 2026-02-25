import { createDbClient, resolveEnvironmentConnection } from "./db/index";

async function main(): Promise<void> {
  const client = createDbClient();

  try {
    const envConnection = resolveEnvironmentConnection();

    if (!envConnection) {
      throw new Error(
        "No DB environment configuration found. Set DB_ENGINE and related DB_* values first.",
      );
    }

    await client.setConnection(envConnection);

    const startedAt = Date.now();
    await client.ping();
    const latencyMs = Date.now() - startedAt;
    const info = client.getConnectionInfo();

    // eslint-disable-next-line no-console
    console.log(
      `DB check OK: engine=${info?.engine ?? envConnection.engine} db=${info?.dbName ?? "-"} latencyMs=${latencyMs}`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`DB check failed: ${message}`);
  process.exitCode = 1;
});
