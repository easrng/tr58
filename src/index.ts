import {
  LinkTermInclude,
  LinkTermOpen,
  LinkTermClose,
  LinkTermSoft,
  LinkEmail,
  LinkCloseBracket,
  TLD,
} from "./generated.ts";

const normalizeHostURL = new URL("https://invalid");
const normalizeHost = (s: string) => {
  normalizeHostURL.hostname = s;
  return normalizeHostURL.hostname;
};

const USER_INFO_RE = new RegExp(`(mailto:)?${LinkEmail.source}+$`, "iu");
const DOT_RE = /[.\u3002\uFF0E\uFF61]/gu;
const AT_RE = /[\uff20@]/gu;
const START_RE =
  /(?<scheme>[a-z][a-z0-9+.-]*:\/\/)|(?<domain>([-\p{L}\p{N}\p{M}\u00DF\u03C2\u06FD\u06FE\u0F0B\u3007]+[\.\u3002]){1,4}[-\p{L}\p{N}\p{M}]+(?![-\p{L}\p{N}\p{M}]))/giu;

function getLinkTerm(char: string) {
  if (LinkTermInclude.test(char)) return "Include";
  if (LinkTermOpen.test(char)) return "Open";
  if (LinkTermClose.test(char)) return "Close";
  if (LinkTermSoft.test(char)) return "Soft";
  return "Hard";
}

const tagsMap = new WeakMap();

export type Token = { type: "Text" | "URL"; value: string };
export function* tokenize(
  input: string,
  options?: {
    nonStandard?: { domainHandle?: boolean; email?: boolean; tags: string[] };
  },
): Generator<Token> {
  const emailSupport = options?.nonStandard?.email ?? true;
  const handleSupport = options?.nonStandard?.domainHandle ?? false;
  let pos = 0;
  let lastYieldedPos = 0;
  const n = input.length;
  let startRE;

  const tags = options?.nonStandard?.tags;
  if (tags) {
    const cached = tagsMap.get(tags);
    if (cached) {
      startRE = cached;
    } else {
      startRE = new RegExp(
        START_RE.source +
          "|(?<tag>" +
          tags
            .map((s) =>
              [...s]
                .map((s) => `\\u{${s.codePointAt(0)!.toString(16)}}`)
                .join(""),
            )
            .join("|") +
          ")",
        START_RE.flags,
      );
      tagsMap.set(tags, startRE);
    }
  } else {
    startRE = START_RE;
  }

  while (pos < n) {
    startRE.lastIndex = pos;
    const match = startRE.exec(input);
    if (!match) break;

    const { scheme, domain, tag } = match.groups!;
    let matchStart = match.index;
    const email = AT_RE.test(input[matchStart - 1]!);
    let linkEnd = matchStart;
    let part = "none";
    const openStack = [];
    const limit = 125;

    for (let i = matchStart + (tag?.length ?? 0); i < n; i++) {
      const char = input[i]!;
      let nextPart = part;
      if (part === "none" || part === "Path") {
        if (char === "/" || char === ":") nextPart = "Path";
        else if (char === "?") nextPart = "Query";
        else if (char === "#") nextPart = "Fragment";
      } else if (part === "Query") {
        if (char === "#") nextPart = "Fragment";
      } else if (part === "Fragment") {
        if (char === ":" && input.startsWith(":~:", i)) {
          nextPart = "FragmentDirective";
          i += 2;
        }
      }

      // reset bracket matching between parts
      if (
        nextPart !== part ||
        (part === "Path" && char === "/") ||
        (part === "Query" && (char === "=" || char === "&")) ||
        (part === "FragmentDirective" &&
          (char === "," || char === "=" || char === "&"))
      ) {
        openStack.length = 0;
        part = nextPart;
        if (email || tag) {
          break;
        }
        linkEnd = i + 1;
        continue;
      }

      const term = getLinkTerm(char);

      if (term === "Include") {
        linkEnd = i + 1;
      } else if (term === "Soft") {
        // don't update lastSafe yet, soft chars are only included if there's an include'd char after
      } else if (term === "Open") {
        if (openStack.length < limit) {
          openStack.push(char);
        } else {
          break;
        }
      } else if (term === "Close") {
        if (openStack.length > 0) {
          const top = openStack[openStack.length - 1];
          if (LinkCloseBracket[char] === top) {
            openStack.pop();
            linkEnd = i + 1;
          } else {
            break;
          }
        } else {
          break;
        }
      } else if (term === "Hard") {
        break;
      }
    }

    let isURL = !domain;
    if (domain) {
      const precedingTerm = getLinkTerm(
        matchStart > 0 ? input[matchStart - 1]! : "",
      );
      if (
        precedingTerm === "Hard" ||
        precedingTerm === "Open" ||
        precedingTerm === "Close" ||
        email
      ) {
        const hostPart = domain.split(":")[0]!;
        const labels = hostPart.split(DOT_RE);
        const tld = normalizeHost(labels[labels.length - 1]!);
        if (TLD.test(tld)) {
          isURL = true;
          if (email) {
            const userinfo = input
              .slice(lastYieldedPos, matchStart - 1)
              .match(USER_INFO_RE);
            if (userinfo && emailSupport) {
              matchStart -= userinfo[0].length + 1;
            } else {
              if ((isURL = handleSupport)) {
                matchStart--;
              }
            }
          }
        }
      }
    }
    if (isURL) {
      if (matchStart > lastYieldedPos) {
        yield { type: "Text", value: input.slice(lastYieldedPos, matchStart) };
      }
      const rawLink = input.slice(matchStart, linkEnd);
      // validate userinfo and domain
      const valid =
        tag ||
        /^(?:[a-z][a-z0-9+.-]*:\/\/)(?:[^@/?#.-]([^@/?#.]*[^@/?#.-])?)(?:\.[^@/?#.-]([^@/?#.]*[^@/?#.-])?)*\.?([/?#]|$)|^mailto:(?:(?:[^@/?#.-]([^@/?#.]*[^@/?#.-])?)(?:\.[^@/?#.-]([^@/?#.]*[^@/?#.-])?)*)?@(?:[^@/?#.-]([^@/?#.]*[^@/?#.-])?)(?:\.[^@/?#.-]([^@/?#.]*[^@/?#.-])?)*$/.test(
          (scheme || email ? "" : "https://") +
            (email ? rawLink.replace(/^(mailto:)?/i, "mailto:") : rawLink)
              .replace(DOT_RE, ".")
              .replace(AT_RE, "@"),
        );
      yield { type: valid ? "URL" : "Text", value: rawLink };
      pos = linkEnd;
      lastYieldedPos = linkEnd;
    } else {
      pos = matchStart + 1;
    }
  }

  if (lastYieldedPos < n) {
    yield { type: "Text", value: input.slice(lastYieldedPos) };
  }
}
