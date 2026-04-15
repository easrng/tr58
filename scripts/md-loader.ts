import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(".md")) {
      return nextLoad(url, context);
    }

    const path = fileURLToPath(url);
    const markdown = readFileSync(path, "utf8");
    const match = markdown.match(/^```js$([^]*?)^```$/m);

    if (!match) {
      throw new Error(`[md-loader] No \`\`\`js block found in ${path}`);
    }

    return {
      format: "module",
      source: match[1],
      shortCircuit: true,
    };
  },
});
