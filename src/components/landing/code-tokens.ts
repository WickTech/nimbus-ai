export type Lang = "ts" | "prisma";
export type TokenKind = "plain" | "keyword" | "string" | "comment";
export type Token = { text: string; kind: TokenKind };

const KEYWORDS: Record<Lang, string> = {
  ts: "const|await|return|async|throw|if|new",
  prisma: "model",
};

/**
 * Tiny highlighter for the landing-page code excerpts: comments, strings and a short keyword list per language.
 * It exists so the excerpts need no syntax-highlighting dependency; it is not a parser.
 */
export function tokenize(code: string, lang: Lang = "ts"): Token[] {
  const pattern = new RegExp(`(\\/\\/.*$|"(?:[^"\\\\]|\\\\.)*"|\\b(?:${KEYWORDS[lang]})\\b)`, "gm");
  const tokens: Token[] = [];
  let last = 0;
  for (const match of code.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) tokens.push({ text: code.slice(last, start), kind: "plain" });
    const text = match[0];
    const kind: TokenKind = text.startsWith("//") ? "comment" : text.startsWith('"') ? "string" : "keyword";
    tokens.push({ text, kind });
    last = start + text.length;
  }
  if (last < code.length) tokens.push({ text: code.slice(last), kind: "plain" });
  return tokens;
}
