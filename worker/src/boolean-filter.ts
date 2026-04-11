/**
 * Boolean expression parser for keyword filtering.
 * Standalone copy for the worker — mirrors src/lib/boolean-filter.ts
 *
 * Supports: AND, OR, NOT, parentheses, quoted phrases, comma-as-OR.
 */

type AstNode =
  | { kind: "WORD"; value: string }
  | { kind: "PHRASE"; value: string }
  | { kind: "AND"; left: AstNode; right: AstNode }
  | { kind: "OR"; left: AstNode; right: AstNode }
  | { kind: "NOT"; operand: AstNode };

type Token =
  | "AND"
  | "OR"
  | "NOT"
  | "("
  | ")"
  | { kind: "WORD" | "PHRASE"; value: string };

function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  const q = query.trim();
  let i = 0;

  while (i < q.length) {
    if (/\s/.test(q[i])) { i++; continue; }
    if (q[i] === ",") { tokens.push("OR"); i++; continue; }
    if (q[i] === "(") { tokens.push("("); i++; continue; }
    if (q[i] === ")") { tokens.push(")"); i++; continue; }
    if (q[i] === '"') {
      let j = q.indexOf('"', i + 1);
      if (j === -1) j = q.length;
      const raw = q.slice(i + 1, j);
      const normalized = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      tokens.push({ kind: "PHRASE", value: normalized });
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < q.length && !/\s/.test(q[j]) && q[j] !== "(" && q[j] !== ")" && q[j] !== '"' && q[j] !== ",") j++;
    const word = q.slice(i, j);
    const upper = word.toUpperCase();
    if (upper === "AND") tokens.push("AND");
    else if (upper === "OR") tokens.push("OR");
    else if (upper === "NOT") tokens.push("NOT");
    else tokens.push({ kind: "WORD", value: word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") });
    i = j;
  }
  return tokens;
}

function parseExpr(tokens: Token[], pos: number): [AstNode, number] {
  let [left, p] = parseTerm(tokens, pos);
  while (p < tokens.length && tokens[p] === "OR") {
    p++;
    const [right, np] = parseTerm(tokens, p);
    left = { kind: "OR", left, right };
    p = np;
  }
  return [left, p];
}

function parseTerm(tokens: Token[], pos: number): [AstNode, number] {
  let [left, p] = parseFactor(tokens, pos);
  while (
    p < tokens.length &&
    (tokens[p] === "AND" || typeof tokens[p] === "object" || tokens[p] === "(" || tokens[p] === "NOT")
  ) {
    if (tokens[p] === "AND") p++;
    const [right, np] = parseFactor(tokens, p);
    left = { kind: "AND", left, right };
    p = np;
  }
  return [left, p];
}

function parseFactor(tokens: Token[], pos: number): [AstNode, number] {
  if (pos >= tokens.length) return [{ kind: "WORD", value: "" }, pos];
  const tok = tokens[pos];
  if (tok === "NOT") {
    const [operand, p] = parseFactor(tokens, pos + 1);
    return [{ kind: "NOT", operand }, p];
  }
  if (tok === "(") {
    const [node, p] = parseExpr(tokens, pos + 1);
    const np = p < tokens.length && tokens[p] === ")" ? p + 1 : p;
    return [node, np];
  }
  if (typeof tok === "object") return [tok, pos + 1];
  return [{ kind: "WORD", value: "" }, pos + 1];
}

function evalNode(node: AstNode, text: string): boolean {
  switch (node.kind) {
    case "WORD":
    case "PHRASE":
      return node.value === "" || text.includes(node.value);
    case "AND":
      return evalNode(node.left, text) && evalNode(node.right, text);
    case "OR":
      return evalNode(node.left, text) || evalNode(node.right, text);
    case "NOT":
      return !evalNode(node.operand, text);
  }
}

export function compileBooleanExpr(query: string): ((text: string) => boolean) | null {
  if (!query || !query.trim()) return null;
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;
  const [ast] = parseExpr(tokens, 0);
  return (text: string) => evalNode(ast, text);
}
