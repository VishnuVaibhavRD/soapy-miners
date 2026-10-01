import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, ".env.local");

let url;
let anon;
try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const name = t.slice(0, i).trim();
    const value = t.slice(i + 1).trim();
    if (name === "NEXT_PUBLIC_SUPABASE_URL") url = value;
    if (name === "NEXT_PUBLIC_SUPABASE_ANON_KEY") anon = value;
  }
} catch (err) {
  console.error("read .env.local failed: " + err.message);
  process.exit(2);
}

const client = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { count, error } = await client
  .from("marketplace_listings")
  .select("id", { count: "exact", head: true });

if (error) {
  console.log("SUPABASE marketplace_listings count ERROR: " + error.message);
} else {
  console.log("SUPABASE marketplace_listings total rows = " + count);
}

const { data, error: e2 } = await client
  .from("marketplace_listings")
  .select("chain_listing_id, status, seller_wallet, resource_type, amount, price_gd, contract_address")
  .limit(10);

if (e2) {
  console.log("SUPABASE sample ERROR: " + e2.message);
} else {
  console.log("SUPABASE sample rows = " + (data ? data.length : 0));
  console.log(JSON.stringify(data, null, 2));
}

process.exit(0);
