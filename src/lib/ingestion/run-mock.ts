import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });

async function main() {
  const { closeDbPool } = await import("@/db");
  const { MockIngestionSource } = await import("./mock");
  const { ingestChannel } = await import("./pipeline");

  const source = new MockIngestionSource();
  const targets = ["uz_realty_tashkent", "uz_daily_rent"];

  for (const username of targets) {
    const result = await ingestChannel({ source, channelUsername: username });
    console.log(
      `[mock] ${username}: fetched=${result.fetched} inserted=${result.inserted} skipped=${result.skipped}`,
    );
  }

  await closeDbPool();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
