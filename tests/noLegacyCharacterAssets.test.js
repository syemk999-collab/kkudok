import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const bannedPaths = [
  "android/app/src/main/res/drawable-nodpi/kkudok_character_guide.png",
  "android/app/src/main/res/drawable-nodpi/kkudok_character_mascot.png",
  "public/assets/kkudok/cancel_guide_character.png",
  "public/assets/kkudok/character.png",
  "public/assets/kkudok/character_done.png",
  "public/assets/kkudok/character_guide.png",
  "public/assets/kkudok/character_guide.webp",
  "public/assets/kkudok/character_idle.png",
  "public/assets/kkudok/character_loading.png",
  "public/assets/kkudok/character_mascot.png",
  "public/assets/kkudok/character_sorry.png",
];

const bannedTokens = [
  "/assets/kkudok/cancel_guide_character.png",
  "/assets/kkudok/character.png",
  "/assets/kkudok/character_done.png",
  "/assets/kkudok/character_guide.png",
  "/assets/kkudok/character_guide.webp",
  "/assets/kkudok/character_idle.png",
  "/assets/kkudok/character_loading.png",
  "/assets/kkudok/character_mascot.png",
  "/assets/kkudok/character_sorry.png",
  "R.drawable.kkudok_character_guide",
  "R.drawable.kkudok_character_mascot",
];
const textExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".java", ".xml", ".json", ".css", ".html", ".md"]);

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (textExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

test("legacy character assets stay permanently removed", () => {
  for (const bannedPath of bannedPaths) {
    assert.equal(fs.existsSync(bannedPath), false, `legacy character asset was reintroduced: ${bannedPath}`);
  }

  const roots = ["src", "android/app/src/main", "public", "tests", "scripts"];
  const offenders = [];

  for (const root of roots) {
    for (const file of walk(root)) {
      if (file.endsWith("noLegacyCharacterAssets.test.js")) continue;
      const source = fs.readFileSync(file, "utf8");
      for (const token of bannedTokens) {
        if (source.includes(token)) offenders.push(`${file} -> ${token}`);
      }
    }
  }

  assert.deepEqual(offenders, [], `legacy character references were reintroduced:\n${offenders.join("\n")}`);
});
