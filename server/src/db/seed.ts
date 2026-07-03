/**
 * Seeds one household, the 2 known users, and starter rooms/categories.
 * Safe to re-run: skips creation if a household already exists.
 *   npm run seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool, query, queryOne } from "./index.js";

const STARTER_ROOMS: Array<{ name: string; icon: string }> = [
  { name: "סלון", icon: "🛋️" },
  { name: "מטבח", icon: "🍽️" },
  { name: "חדר הורים", icon: "🛏️" },
  { name: "חדר ילדים", icon: "👶" },
  { name: "משרד", icon: "💻" },
];

const STARTER_CATEGORIES = ["ריהוט", "תאורה", "מכשירי חשמל", "טקסטיל", "אחסון", "אביזרים"];

async function run() {
  const existing = await queryOne<{ id: string }>("SELECT id FROM households LIMIT 1");
  if (existing) {
    console.log("A household already exists, skipping seed:", existing.id);
    return;
  }

  const household = await queryOne<{ id: string }>(
    "INSERT INTO households (name) VALUES ($1) RETURNING id",
    ["הבית שלנו"]
  );
  if (!household) throw new Error("Failed to create household");
  console.log("Created household:", household.id);

  const users = [
    {
      username: process.env.SEED_USER_1_USERNAME,
      password: process.env.SEED_USER_1_PASSWORD,
      name: process.env.SEED_USER_1_NAME || "משתמש 1",
    },
    {
      username: process.env.SEED_USER_2_USERNAME,
      password: process.env.SEED_USER_2_PASSWORD,
      name: process.env.SEED_USER_2_NAME || "משתמש 2",
    },
  ];

  for (const u of users) {
    if (!u.username || !u.password) {
      throw new Error("SEED_USER_*_USERNAME and SEED_USER_*_PASSWORD must be set in .env");
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    await query(
      "INSERT INTO users (household_id, username, password_hash, display_name) VALUES ($1, $2, $3, $4)",
      [household.id, u.username, passwordHash, u.name]
    );
    console.log("Created user:", u.username);
  }

  for (let i = 0; i < STARTER_ROOMS.length; i++) {
    const r = STARTER_ROOMS[i];
    await query("INSERT INTO rooms (household_id, name, icon, sort_order) VALUES ($1, $2, $3, $4)", [
      household.id,
      r.name,
      r.icon,
      i,
    ]);
  }
  console.log(`Created ${STARTER_ROOMS.length} rooms.`);

  for (let i = 0; i < STARTER_CATEGORIES.length; i++) {
    await query("INSERT INTO categories (household_id, name, sort_order) VALUES ($1, $2, $3)", [
      household.id,
      STARTER_CATEGORIES[i],
      i,
    ]);
  }
  console.log(`Created ${STARTER_CATEGORIES.length} categories.`);

  console.log("Seed complete.");
}

run()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
