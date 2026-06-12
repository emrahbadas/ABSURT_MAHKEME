import { db } from "../client";
import { case_cards } from "../schema/case_cards";

async function seed(): Promise<void> {
  await db.insert(case_cards).values([
    { content: "Kavga, son cips kirintisi icin patlak verir.", weight: 2, emoji: "🍟", is_active: 1 },
    { content: "Iki kisi uzaktan kumanda mulkiyetini tartisiyor.", weight: 1, emoji: "📺", is_active: 1 }
  ]);

  process.stdout.write("db seed completed\n");
}

seed().catch((error) => {
  process.stderr.write(`db seed failed: ${String(error)}\n`);
  process.exit(1);
});
