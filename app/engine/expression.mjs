/**
 * Sandboxed expression evaluator for the Omni Matrix engine.
 *
 * Powers `derived` field values and roll `pool` expressions in a system
 * definition. This is NOT JavaScript eval — it parses a small, safe
 * grammar and evaluates it against a character's values, so a shared P2P
 * session can never execute arbitrary code from a definition.
 *
 * Grammar (low -> high precedence):
 *   ternary    := logicalOr ('?' expr ':' expr)?
 *   logicalOr  := logicalAnd ('||' logicalAnd)*
 *   logicalAnd := equality ('&&' equality)*
 *   equality   := comparison (('=='|'!=') comparison)*
 *   comparison := additive (('<'|'<='|'>'|'>=') additive)*
 *   additive   := multiplicative (('+'|'-') multiplicative)*
 *   multiplic. := unary (('*'|'/'|'%') unary)*
 *   unary      := ('!'|'-') unary | postfix
 *   postfix    := primary ('.' identifier)*
 *   primary    := number | string | call | identifier | '(' expr ')'
 *   call       := identifier '(' (expr (',' expr)*)? ')'
 *
 * Identifiers resolve to field values via the supplied `vars`. Member
 * access (`pool.current`, `pool.max`, `track.length`, `track.filled`)
 * reads sub-values. Only whitelisted functions may be called.
 *
 * Dependency-free ES module; ports directly to the TS app.
 */

// ---- Tokenizer -----------------------------------------------------------

const PUNCT = [
  '&&', '||', '==', '!=', '<=', '>=',
  '+', '-', '*', '/', '%', '<', '>', '!', '?', ':', '(', ')', ',', '.',
];

function tokenize(src) {
  const tokens = [];
  let i = 0;
  const isIdStart = (c) => /[A-Za-z_]/.test(c);
  const isId = (c) => /[A-Za-z0-9_]/.test(c);
  const isDigit = (c) => /[0-9]/.test(c);

  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }

    // string literal
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let val = '';
      while (j < src.length && src[j] !== quote) {
        if (src[j] === '\\' && j + 1 < src.length) { val += src[j + 1]; j += 2; }
        else { val += src[j]; j++; }
      }
      if (j >= src.length) throw new ExpressionError('Unterminated string literal');
      tokens.push({ type: 'string', value: val });
      i = j + 1;
      continue;
    }

    // number
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      let j = i;
      while (j < src.length && (isDigit(src[j]) || src[j] === '.')) j++;
      tokens.push({ type: 'number', value: Number(src.slice(i, j)) });
      i = j;
      continue;
    }

    // identifier / keyword
    if (isIdStart(c)) {
      let j = i;
      while (j < src.length && isId(src[j])) j++;
      tokens.push({ type: 'ident', value: src.slice(i, j) });
      i = j;
      continue;
    }

    // punctuator (longest match first)
    const two = src.slice(i, i + 2);
    if (PUNCT.includes(two)) { tokens.push({ type: 'punct', value: two }); i += 2; continue; }
    const one = src.slice(i, i + 1);
    if (PUNCT.includes(one)) { tokens.push({ type: 'punct', value: one }); i += 1; continue; }

    throw new ExpressionError(`Unexpected character '${c}' at position ${i}`);
  }

  tokens.push({ type: 'eof' });
  return tokens;
}

// ---- Parser (recursive descent) -----------------------------------------

class ExpressionError extends Error {}

function parse(src) {
  const tokens = tokenize(src);
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const isPunct = (v) => peek().type === 'punct' && peek().value === v;
  const eat = (v) => {
    if (!isPunct(v)) throw new ExpressionError(`Expected '${v}'`);
    return next();
  };

  function parseExpr() { return parseTernary(); }

  function parseTernary() {
    const cond = parseBinary(0);
    if (isPunct('?')) {
      next();
      const a = parseExpr();
      eat(':');
      const b = parseExpr();
      return { kind: 'cond', cond, a, b };
    }
    return cond;
  }

  // precedence-climbing for binary operators
  const BIN = [
    ['||'], ['&&'],
    ['==', '!='], ['<', '<=', '>', '>='],
    ['+', '-'], ['*', '/', '%'],
  ];

  function parseBinary(level) {
    if (level >= BIN.length) return parseUnary();
    let left = parseBinary(level + 1);
    while (peek().type === 'punct' && BIN[level].includes(peek().value)) {
      const op = next().value;
      const right = parseBinary(level + 1);
      left = { kind: 'bin', op, left, right };
    }
    return left;
  }

  function parseUnary() {
    if (isPunct('!') || isPunct('-')) {
      const op = next().value;
      return { kind: 'unary', op, arg: parseUnary() };
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let node = parsePrimary();
    while (isPunct('.')) {
      next();
      const prop = next();
      if (prop.type !== 'ident') throw new ExpressionError('Expected property name after "."');
      node = { kind: 'member', obj: node, prop: prop.value };
    }
    return node;
  }

  function parsePrimary() {
    const t = peek();
    if (t.type === 'number') { next(); return { kind: 'num', value: t.value }; }
    if (t.type === 'string') { next(); return { kind: 'str', value: t.value }; }
    if (isPunct('(')) { next(); const e = parseExpr(); eat(')'); return e; }
    if (t.type === 'ident') {
      next();
      if (isPunct('(')) {
        next();
        const args = [];
        if (!isPunct(')')) {
          args.push(parseExpr());
          while (isPunct(',')) { next(); args.push(parseExpr()); }
        }
        eat(')');
        return { kind: 'call', name: t.value, args };
      }
      return { kind: 'var', name: t.value };
    }
    throw new ExpressionError(`Unexpected token '${t.value ?? t.type}'`);
  }

  const ast = parseExpr();
  if (peek().type !== 'eof') throw new ExpressionError('Unexpected trailing input');
  return ast;
}

// ---- Whitelisted functions ----------------------------------------------

const num = (v) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const FUNCTIONS = {
  min: (...a) => Math.min(...a.map(num)),
  max: (...a) => Math.max(...a.map(num)),
  floor: (x) => Math.floor(num(x)),
  ceil: (x) => Math.ceil(num(x)),
  round: (x) => Math.round(num(x)),
  abs: (x) => Math.abs(num(x)),
  clamp: (x, lo, hi) => Math.min(Math.max(num(x), num(lo)), num(hi)),
  if: (c, a, b) => (c ? a : b),
  // sum(listValue, "column") / sum(listValue)
  sum: (list, col) => {
    if (!Array.isArray(list)) return 0;
    return list.reduce((acc, row) => acc + num(col == null ? row : row?.[col]), 0);
  },
  count: (list) => (Array.isArray(list) ? list.length : 0),
};

// ---- Evaluator -----------------------------------------------------------

function evalNode(node, vars) {
  switch (node.kind) {
    case 'num': return node.value;
    case 'str': return node.value;
    case 'var': {
      if (!(node.name in vars)) {
        // unknown identifier resolves to 0 so partial sheets don't crash
        return 0;
      }
      return vars[node.name];
    }
    case 'member': {
      const obj = evalNode(node.obj, vars);
      return readMember(obj, node.prop);
    }
    case 'unary': {
      const v = evalNode(node.arg, vars);
      return node.op === '!' ? !truthy(v) : -num(v);
    }
    case 'cond':
      return truthy(evalNode(node.cond, vars)) ? evalNode(node.a, vars) : evalNode(node.b, vars);
    case 'bin':
      return evalBin(node, vars);
    case 'call': {
      const fn = FUNCTIONS[node.name];
      if (!fn) throw new ExpressionError(`Unknown function '${node.name}'`);
      const args = node.args.map((a) => evalNode(a, vars));
      return fn(...args);
    }
    default:
      throw new ExpressionError(`Unknown node '${node.kind}'`);
  }
}

function readMember(obj, prop) {
  if (Array.isArray(obj)) {
    if (prop === 'length') return obj.length;
    if (prop === 'filled') {
      // heuristic: count boxes that are not an "empty" state
      return obj.filter((v) => v && v !== 'ok' && v !== 'empty' && v !== '').length;
    }
    return 0;
  }
  if (obj && typeof obj === 'object') {
    return obj[prop] ?? 0;
  }
  return 0;
}

function truthy(v) {
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  return !!v;
}

function evalBin(node, vars) {
  const { op } = node;
  // short-circuit logicals
  if (op === '&&') return truthy(evalNode(node.left, vars)) ? evalNode(node.right, vars) : false;
  if (op === '||') {
    const l = evalNode(node.left, vars);
    return truthy(l) ? l : evalNode(node.right, vars);
  }
  const l = evalNode(node.left, vars);
  const r = evalNode(node.right, vars);
  switch (op) {
    case '+': return (typeof l === 'string' || typeof r === 'string') ? `${l}${r}` : num(l) + num(r);
    case '-': return num(l) - num(r);
    case '*': return num(l) * num(r);
    case '/': return num(r) === 0 ? 0 : num(l) / num(r);
    case '%': return num(r) === 0 ? 0 : num(l) % num(r);
    case '==': return l === r;
    case '!=': return l !== r;
    case '<': return num(l) < num(r);
    case '<=': return num(l) <= num(r);
    case '>': return num(l) > num(r);
    case '>=': return num(l) >= num(r);
    default: throw new ExpressionError(`Unknown operator '${op}'`);
  }
}

// ---- Public API ----------------------------------------------------------

const cache = new Map();

/** Parse (and cache) an expression string into an AST. */
export function compile(src) {
  if (cache.has(src)) return cache.get(src);
  const ast = parse(src);
  cache.set(src, ast);
  return ast;
}

/**
 * Evaluate an expression against a map of variable values.
 * @param {string} src   the expression source
 * @param {object} vars  fieldId -> value (numbers, strings, arrays, {current,max})
 */
export function evaluate(src, vars = {}) {
  return evalNode(compile(src), vars);
}

/** Collect the field identifiers an expression references (for dep graphs). */
export function dependencies(src) {
  const found = new Set();
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.kind === 'var') found.add(n.name);
    if (n.kind === 'member' && n.obj.kind === 'var') found.add(n.obj.name);
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(compile(src));
  return [...found];
}

export { ExpressionError };
