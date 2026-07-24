import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const excluded = new Set([
  "Cargo.lock",
  "package-lock.json",
  "scripts/oss-boundary-smoke.mjs",
]);
const blocked = [
  /\bstripe\b/i,
  /\bbilling\b/i,
  /entitlement/i,
  /founding[_ -]?host/i,
  /buy\.stripe\.com/i,
  /client_reference_id/i,
  /VITE_SILVERFISH_MANAGED_SERVICE/,
  /VITE_SILVERFISH_SUBSCRIBE_URL/,
  /EXPECTED_STRIPE_PAYMENT_LINK_ID/,
  /SILVERFISH_PAID_/,
  /SILVERFISH_RELAY_PROXY_SECRET/,
  /x-silverfish-managed-plan/i,
  /subscription_entitlements/i,
  /roomLifetimeSeconds/,
  /RelayRoomLimits/,
  /SILVERFISH_MAX_GUESTS_PER_ROOM/,
  /SILVERFISH_ROOM_LIFETIME_SECONDS/,
  /MAX_GUESTS_PER_ROOM/,
  /MAX_ROOMS/,
  /60-minute rooms/i,
  /start free session/i,
];

const sourceFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean)
  .filter((path) => !excluded.has(path) && existsSync(path) && statSync(path).isFile());

const builtFiles = execFileSync(
  "find",
  ["apps/desktop/dist", "-type", "f", "-print"],
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);

const violations = [];
for (const path of [...sourceFiles, ...builtFiles]) {
  const contents = readFileSync(path).toString("utf8");
  for (const pattern of blocked) {
    if (pattern.test(contents)) violations.push(`${path}: ${pattern}`);
  }
}

if (violations.length) {
  throw new Error(`managed-product code leaked into the open-source edition:\n${violations.join("\n")}`);
}

console.log(`OSS boundary passed: ${sourceFiles.length} source files and ${builtFiles.length} build files are clean`);
