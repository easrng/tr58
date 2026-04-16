import fs from "node:fs";
import { createRequire } from "node:module";
import regexgen from "regexgen";
// properties in js regex
const NATIVE_PROPERTIES = [
  "ASCII",
  "ASCII_Hex_Digit",
  "Alphabetic",
  "Any",
  "Assigned",
  "Bidi_Control",
  "Bidi_Mirrored",
  "Case_Ignorable",
  "Cased",
  "Changes_When_Casefolded",
  "Changes_When_Casemapped",
  "Changes_When_Lowercased",
  "Changes_When_NFKC_Casefolded",
  "Changes_When_Titlecased",
  "Changes_When_Uppercased",
  "Dash",
  "Default_Ignorable_Code_Point",
  "Deprecated",
  "Diacritic",
  "Emoji",
  "Emoji_Component",
  "Emoji_Modifier",
  "Emoji_Modifier_Base",
  "Emoji_Presentation",
  "Extended_Pictographic",
  "Extender",
  "Grapheme_Base",
  "Grapheme_Extend",
  "Hex_Digit",
  "IDS_Binary_Operator",
  "IDS_Trinary_Operator",
  "ID_Continue",
  "ID_Start",
  "Ideographic",
  "Join_Control",
  "Logical_Order_Exception",
  "Lowercase",
  "Math",
  "Noncharacter_Code_Point",
  "Pattern_Syntax",
  "Pattern_White_Space",
  "Quotation_Mark",
  "Radical",
  "Regional_Indicator",
  "Sentence_Terminal",
  "Soft_Dotted",
  "Terminal_Punctuation",
  "Unified_Ideograph",
  "Uppercase",
  "Variation_Selector",
  "White_Space",
  "XID_Continue",
  "XID_Start",
];

const format = (cp: number) =>
  cp > 0xffff
    ? `\\u{${cp.toString(16).toUpperCase()}}`
    : `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}`;

function toRanges(codePoints: number[]) {
  if (codePoints.length === 0) return [];
  const ranges = [];
  let start = codePoints[0]!;
  let end = start;
  for (let i = 1; i <= codePoints.length; i++) {
    if (i < codePoints.length && codePoints[i] === end + 1) {
      end = codePoints[i]!;
    } else {
      ranges.push(
        start === end ? format(start) : `${format(start)}-${format(end)}`,
      );
      if (i < codePoints.length) {
        start = codePoints[i]!;
        end = start;
      }
    }
  }
  return ranges;
}

let out = "";
const require = createRequire(import.meta.url);
const propertyMap = new Map<string, Set<number>>();
for (const prop of NATIVE_PROPERTIES) {
  const mod = require(
    `@unicode/unicode-15.0.0/Binary_Property/${prop}/code-points.js`,
  );
  propertyMap.set(prop, new Set(mod.default));
}

for (const fileName of ["LinkEmail", "LinkTerm", "LinkBracket"]) {
  const text = fs.readFileSync(
    new URL(import.meta.resolve("../data/" + fileName + ".txt")),
    "utf8",
  );

  // Map to store Sets of code points keyed by property value (e.g., "Soft", "Close", or "Binary")
  const valueGroups = new Map<string, Set<number>>();

  text.split("\n").forEach((line) => {
    line = line.split("#")[0]!.trim();
    if (!line) return;

    const parts = line.split(";").map((p) => p.trim());
    const rangePart = parts[0]!;
    const propertyValue = parts[1] || "";

    if (!valueGroups.has(propertyValue))
      valueGroups.set(propertyValue, new Set());
    const currentSet = valueGroups.get(propertyValue)!;

    if (rangePart.includes("..")) {
      const [start, end] = rangePart.split("..").map((h) => parseInt(h, 16));
      for (let i = start!; i <= end!; i++) currentSet.add(i);
    } else {
      currentSet.add(parseInt(rangePart, 16));
    }
  });

  if (fileName === "LinkBracket") {
    out += `export const LinkCloseBracket: Record<string, string> = Object.freeze({${[...valueGroups.entries()].map((e) => `"${format([...e[1]][0]!)}": "${format(parseInt(e[0], 16))}"`).join(", ")}})\n`;
  } else {
    for (const [valName, targetSet] of valueGroups.entries()) {
      let candidates: { name: string; set: Set<number> }[] = [];
      for (const [propName, propSet] of propertyMap.entries()) {
        if (propSet.isSubsetOf(targetSet)) {
          candidates.push({ name: propName, set: propSet });
        }
      }

      const maximalSubsets = candidates.filter((current) => {
        return !candidates.some(
          (other) =>
            current.name !== other.name && current.set.isSubsetOf(other.set),
        );
      });

      const remainingSet = new Set(targetSet);
      for (const sub of maximalSubsets) {
        for (const cp of sub.set) remainingSet.delete(cp);
      }

      const propertyParts = maximalSubsets.map((s) => `\\p{${s.name}}`);
      const manualRanges = toRanges([...remainingSet].sort((a, b) => a - b));
      const regexString = `[${propertyParts.join("")}${manualRanges.join("")}]`;

      out += `export const ${fileName}${valName} = /${regexString}/u\n`;
    }
  }
}
const psl = [
  ...new Set(
    fs
      .readFileSync(
        new URL(
          import.meta.resolve("public-suffix-list/public_suffix_list.dat"),
        ),
        "utf-8",
      )
      .split("\n")
      .filter((e) => e[1] && e[1] !== "/")
      .map((e) => new URL("https://" + e.split(".").at(-1)).hostname),
  ),
  "test",
].sort();
const rg = (a: string[]) => regexgen(a).source.replace(/\(\?:/g, "(");
out += `export const TLD = /^(${rg(psl.filter((e) => e.length === 2)) + "|" + rg(psl.filter((e) => e.startsWith("xn--"))).replace("xn\\-\\-((vermgensberat(ung\\-pw|er\\-ct", "xn--((vermgensberat(ung-pw|er-ct") + "|" + rg(psl.filter((e) => e.length !== 2 && !e.startsWith("xn--")))})$/\n`;
fs.writeFileSync(
  new URL(import.meta.resolve("../src/generated.ts")),
  out,
  "utf-8",
);
console.log("updated generated.ts!");
