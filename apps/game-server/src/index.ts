import "dotenv/config";
import { bootstrapServer } from "./server";

async function main(): Promise<void> {
  const { httpServer, config } = await bootstrapServer();

  httpServer.listen(config.port, () => {
    process.stdout.write(`game-server listening on :${config.port}\n`);
  });
}

main().catch((error) => {
  process.stderr.write(`bootstrap error: ${String(error)}\n`);
  process.exit(1);
});
