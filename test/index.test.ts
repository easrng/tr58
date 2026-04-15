import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { createRequire } from "node:module";
const { tokenize } = createRequire(import.meta.url)("../src/index.ts");

test("LinkDetectionTest", async () => {
  const fileContent = fs.readFileSync(
    new URL(import.meta.resolve("../data/LinkDetectionTest.txt")),
    "utf8",
  );

  const lines = fileContent.split(/\r?\n/);
  const failures = [];
  let totalTests = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line || line.startsWith("#")) continue;

    totalTests++;
    const expected = line;
    const input = line.replace(/[⸠⸡]/g, "");
    const actual = [...tokenize(input)]
      .map((token) => (token.type === "URL" ? `⸠${token.value}⸡` : token.value))
      .join("");

    if (actual !== expected) {
      failures.push({
        line: i + 1,
        input,
        expected,
        actual,
      });
    }
  }

  if (failures.length > 0) {
    const report = failures
      .map(
        (f) => `line ${f.line}:
expected: ${f.expected}
actual: ${f.actual}`,
      )
      .join("\n" + "-".repeat(3) + "\n");

    console.error(report);
  }
  assert.strictEqual(
    totalTests - failures.length,
    totalTests,
    "all tests should pass",
  );
});
