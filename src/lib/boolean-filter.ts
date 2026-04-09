/**
 * Boolean expression parser for keyword filtering.
 *
 * Supports:
 *  - AND / OR operators (case-insensitive)
 *  - Parentheses for grouping: ( )
 *  - Quoted strings for exact phrase matching: "serviço de limpeza"
 *  - Comma as OR separator (backward-compatible): engenharia, construção
 *  - Bare words match as substrings (current behavior)
 *
 * Grammar:
 *   expression := term (OR term)*
 *   term       := factor (AND factor)*
 *   factor     := NOT? atom
 *   atom       := '(' expression ')' | PHRASE | WORD
 *
 * Implicit AND: two adjacent words without an operator are AND'd.
 * Commas are treated as OR.
 */

// ─── AST ─────────────────────────────────────────────────────────────────────

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

// ─── Tokenizer ───────────────────────────────────────────────────────────────

function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  const q = query.trim();
  let i = 0;

  while (i < q.length) {
    // Skip whitespace
    if (/\s/.test(q[i])) {
      i++;
      continue;
    }
    // Comma → OR
    if (q[i] === ",") {
      tokens.push("OR");
      i++;
      continue;
    }
    if (q[i] === "(") {
      tokens.push("(");
      i++;
      continue;
    }
    if (q[i] === ")") {
      tokens.push(")");
      i++;
      continue;
    }
    // Quoted phrase
    if (q[i] === '"') {
      let j = q.indexOf('"', i + 1);
      if (j === -1) j = q.length;
      const raw = q.slice(i + 1, j);
      const normalized = raw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      tokens.push({ kind: "PHRASE", value: normalized });
      i = j + 1;
      continue;
    }
    // Word / operator keyword
    let j = i;
    while (
      j < q.length &&
      !/\s/.test(q[j]) &&
      q[j] !== "(" &&
      q[j] !== ")" &&
      q[j] !== '"' &&
      q[j] !== ","
    ) {
      j++;
    }
    const word = q.slice(i, j);
    const upper = word.toUpperCase();
    if (upper === "AND") tokens.push("AND");
    else if (upper === "OR") tokens.push("OR");
    else if (upper === "NOT") tokens.push("NOT");
    else {
      const normalized = word
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      tokens.push({ kind: "WORD", value: normalized });
    }
    i = j;
  }
  return tokens;
}

// ─── Recursive-descent parser ────────────────────────────────────────────────

function parseExpr(tokens: Token[], pos: number): [AstNode, number] {
  let [left, p] = parseTerm(tokens, pos);
  while (p < tokens.length && tokens[p] === "OR") {
    p++; // consume OR
    const [right, np] = parseTerm(tokens, p);
    left = { kind: "OR", left, right };
    p = np;
  }
  return [left, p];
}

function parseTerm(tokens: Token[], pos: number): [AstNode, number] {
  let [left, p] = parseFactor(tokens, pos);
  // Implicit AND: adjacent factors without explicit OR
  while (
    p < tokens.length &&
    (tokens[p] === "AND" ||
      typeof tokens[p] === "object" ||
      tokens[p] === "(" ||
      tokens[p] === "NOT")
  ) {
    if (tokens[p] === "AND") p++; // consume explicit AND
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
  if (typeof tok === "object") {
    return [tok, pos + 1];
  }
  // Unexpected token (e.g. stray ")") – skip
  return [{ kind: "WORD", value: "" }, pos + 1];
}

// ─── Evaluator ───────────────────────────────────────────────────────────────

function evalNode(node: AstNode, text: string): boolean {
  switch (node.kind) {
    case "WORD":
      return node.value === "" || text.includes(node.value);
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

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns true if the query uses boolean syntax (operators, parens, quotes).
 * When false, the query is a simple comma-separated list (legacy mode).
 */
export function hasBooleanSyntax(query: string): boolean {
  const tokens = tokenize(query);
  return tokens.some(
    (t) =>
      t === "AND" ||
      t === "NOT" ||
      t === "(" ||
      t === ")" ||
      (typeof t === "object" && t.kind === "PHRASE"),
  );
}

/**
 * Compile a boolean keyword expression into a reusable matcher function.
 * Tokenizes and parses only once; the returned closure just evaluates the AST.
 *
 * @param query  The user-entered expression
 * @returns      A function `(text: string) => boolean`, or `null` if the query is empty.
 */
export function compileBooleanExpr(query: string): ((text: string) => boolean) | null {
  if (!query || !query.trim()) return null;
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;
  const [ast] = parseExpr(tokens, 0);
  return (text: string) => evalNode(ast, text);
}

/**
 * Evaluate a boolean keyword expression against a normalized text string.
 *
 * @param query  The user-entered expression (e.g. `(engenharia OR construção) AND NOT manutenção`)
 * @param text   The already-normalized text to match against (lowercase, no diacritics).
 * @returns      Whether the text matches the expression.
 */
export function matchesBooleanExpr(query: string, text: string): boolean {
  if (!query || !query.trim()) return true; // empty query matches everything
  const tokens = tokenize(query);
  if (tokens.length === 0) return true;
  const [ast] = parseExpr(tokens, 0);
  return evalNode(ast, text);
}
