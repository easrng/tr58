import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  load(url, context, nextLoad) {
    const parsedUrl = new URL(url);
    if (!parsedUrl.pathname.endsWith(".md")) {
      return nextLoad(url, context);
    }

    const path = fileURLToPath(url);
    const markdown = readFileSync(path, "utf8");
    const segments = markdown.split(
      /(?:\n|^)```(js|output)\n([\s\S]*?)^```(?:\n|$)/gm,
    );
    const indexParam = parsedUrl.searchParams.get("index");
    if (indexParam !== null) {
      const index = parseInt(indexParam, 10);
      let content = segments[index]!;
      if (index === segments.length - 1) {
        content = content.trimEnd();
      }

      if ((index - 2) % 3 === 0) {
        const lang = segments[index - 1];

        if (lang === "js") {
          return {
            format: "module",
            source: `console.log(${JSON.stringify("```js\n" + content + "```")});`,
            shortCircuit: true,
          };
        } else if (lang === "output") {
          let lastJsCode = "";
          for (let i = index - 3; i >= 2; i -= 3) {
            if (segments[i - 1] === "js") {
              lastJsCode = segments[i]!;
              break;
            }
          }
          return {
            format: "module",
            source:
              'console.log("```output")\n' +
              lastJsCode +
              '\nconsole.log("```")',
            shortCircuit: true,
          };
        }
      }

      return {
        format: "module",
        source: `console.log(${JSON.stringify(content)});`,
        shortCircuit: true,
      };
    }

    const baseUrl = pathToFileURL(path).href;
    const imports = [];

    for (let i = 0; i < segments.length; i++) {
      if ((i - 1) % 3 === 0) continue;
      imports.push(`import ${JSON.stringify(`${baseUrl}?index=${i}`)};`);
    }

    return {
      format: "module",
      source: imports.join("\n"),
      shortCircuit: true,
    };
  },
});
