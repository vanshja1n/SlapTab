const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const candidates = [
  path.join(os.homedir(), "Library/Application Support/Codex/Local Storage"),
  path.join(os.homedir(), "Library/Application Support/Codex/User Data/Default/Local Storage"),
  path.join(os.homedir(), "Library/Application Support/Google/Chrome/Default/Local Storage")
];

let removed = 0;

for (const root of candidates) {
  if (!fs.existsSync(root)) continue;
  for (const file of fs.readdirSync(root, { recursive: true })) {
    const fullPath = path.join(root, file);
    if (!/file__.*options\.html/i.test(fullPath) && !/leveldb/i.test(fullPath)) continue;
    try {
      fs.rmSync(fullPath, { force: true, recursive: true });
      removed += 1;
    } catch {
      // Best-effort cleanup for local preview storage.
    }
  }
}

console.log(`SlapTab dev reset complete. Removed ${removed} local storage item(s).`);
