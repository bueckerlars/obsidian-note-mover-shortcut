import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLASS_BODY = '(?:advancedNoteMover|note-mover)-[A-Za-z0-9][A-Za-z0-9_-]*';
const PSEUDO =
  /^:(?:hover|focus-visible|focus-within|focus|active|disabled|checked|visited|link|target|empty|root|before|after|placeholder|first-child|last-child|only-child|nth-child|nth-of-type|not|is|where|has|modal|fullscreen)\b/;

/**
 * @typedef {object} UsageReport
 * @property {string[]} unused CSS classes with no TypeScript use
 * @property {string[]} missing TypeScript classes with no CSS rule
 */

/**
 * @param {string} root
 * @returns {UsageReport}
 */
export function analyzeCssUsage(root = ROOT) {
  const allow = readAllowlist(
    path.join(root, 'scripts/css-usage-allowlist.txt')
  );
  const cssClasses = cssPluginClasses(
    fs.readFileSync(path.join(root, 'styles.css'), 'utf8')
  );
  const ts = scanTypeScript(root);
  const unused = [...cssClasses]
    .filter(name => !classIsUsed(name, ts, allow))
    .sort();
  const missing = [...ts.concrete]
    .filter(name => !cssClasses.has(name) && !allow.ts.has(name))
    .sort();
  return { unused, missing };
}

/**
 * @param {string} name
 * @param {{ concrete: Set<string>, patterns: RegExp[] }} ts
 * @param {{ prefixes: string[], keep: Set<string> }} allow
 */
function classIsUsed(name, ts, allow) {
  if (ts.concrete.has(name) || allow.keep.has(name)) {
    return true;
  }
  if (
    allow.prefixes.some(
      prefix => name === prefix || name.startsWith(`${prefix}-`)
    )
  ) {
    return true;
  }
  return ts.patterns.some(pattern => pattern.test(name));
}

/**
 * @param {string} file
 */
function readAllowlist(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file}`);
  }
  /** @type {{ prefixes: string[], keep: Set<string>, ts: Set<string> }} */
  const allow = { prefixes: [], keep: new Set(), ts: new Set() };
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const [kind, name] = line.split(/\s+/);
    if (!name || !/^(?:advancedNoteMover|note-mover)-/.test(name)) {
      throw new Error(`Bad allowlist line: ${raw}`);
    }
    if (kind === 'prefix') allow.prefixes.push(name);
    else if (kind === 'keep') allow.keep.add(name);
    else if (kind === 'ts') allow.ts.add(name);
    else throw new Error(`Bad allowlist kind: ${raw}`);
  }
  return allow;
}

/**
 * @param {string} css
 * @returns {Set<string>}
 */
function cssPluginClasses(css) {
  const classes = new Set();
  const text = stripCssComments(css);
  const re = new RegExp(`\\.(${CLASS_BODY})`, 'g');
  for (const match of text.matchAll(re)) {
    classes.add(match[1]);
  }
  return classes;
}

/**
 * @param {string} css
 */
function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/**
 * @param {string} root
 * @returns {{ concrete: Set<string>, patterns: RegExp[] }}
 */
function scanTypeScript(root) {
  /** @type {Set<string>} */
  const concrete = new Set();
  /** @type {RegExp[]} */
  const patterns = [];
  const files = [];
  collectTs(path.join(root, 'src'), files);
  const main = path.join(root, 'main.ts');
  if (fs.existsSync(main)) files.push(main);

  for (const file of files) {
    const source = stripTsComments(fs.readFileSync(file, 'utf8'));
    const consts = stringConsts(source);
    scanStrings(source, consts, concrete, patterns);
  }
  return { concrete, patterns };
}

/**
 * @param {string} dir
 * @param {string[]} files
 */
function collectTs(dir, files) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'generated') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectTs(full, files);
    else if (entry.name.endsWith('.ts')) files.push(full);
  }
}

/**
 * @param {string} source
 * @returns {Map<string, string>}
 */
function stringConsts(source) {
  /** @type {Map<string, string>} */
  const consts = new Map();
  const decl =
    /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])((?:advancedNoteMover|note-mover)-[^'"\\]*)\2/g;
  for (const match of source.matchAll(decl)) {
    consts.set(match[1], match[3]);
  }
  return consts;
}

/**
 * @param {string} source
 * @param {Map<string, string>} consts
 * @param {Set<string>} concrete
 * @param {RegExp[]} patterns
 */
function scanStrings(source, consts, concrete, patterns) {
  let i = 0;
  while (i < source.length) {
    const quote = source[i];
    if (quote === "'" || quote === '"') {
      const read = readQuoted(source, i, quote);
      addConcrete(read.value, concrete);
      i = read.next;
      continue;
    }
    if (quote === '`') {
      const read = readTemplate(source, i, consts);
      addTemplate(read.value, concrete, patterns);
      i = read.next;
      continue;
    }
    i++;
  }
}

/**
 * @param {string} value
 * @param {Set<string>} concrete
 */
function addConcrete(value, concrete) {
  const re = new RegExp(`(?<![A-Za-z0-9_-])${CLASS_BODY}`, 'g');
  for (const match of value.matchAll(re)) {
    const name = match[0];
    const after = value.slice((match.index ?? 0) + name.length);
    if (after.startsWith(':') && !PSEUDO.test(after)) continue;
    if (after[0] && /[A-Za-z0-9_-]/.test(after[0])) continue;
    concrete.add(name);
  }
}

/**
 * @param {string} value
 * @param {Set<string>} concrete
 * @param {RegExp[]} patterns
 */
function addTemplate(value, concrete, patterns) {
  for (const token of value.split(/\s+/)) {
    if (!token.includes('${}')) {
      addConcrete(token, concrete);
      continue;
    }
    if (!/(?:advancedNoteMover|note-mover)-/.test(token)) continue;
    const body = token.replace(/^[^\w]+|[^\w-]+$/g, '');
    const source = body
      .split('${}')
      .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('[A-Za-z0-9]+');
    patterns.push(new RegExp(`^${source}$`));
  }
}

/**
 * @param {string} source
 * @param {number} start
 * @param {string} quote
 */
function readQuoted(source, start, quote) {
  let value = '';
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === '\\') {
      value += source[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (source[i] === quote) return { value, next: i + 1 };
    value += source[i];
    i++;
  }
  return { value, next: i };
}

/**
 * @param {string} source
 * @param {number} start
 * @param {Map<string, string>} consts
 */
function readTemplate(source, start, consts) {
  let value = '';
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === '\\') {
      value += source[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (source[i] === '`') return { value, next: i + 1 };
    if (source[i] === '$' && source[i + 1] === '{') {
      const expr = readBalanced(source, i + 1);
      const name = expr.text.trim();
      value += consts.get(name) ?? '${}';
      i = expr.next;
      continue;
    }
    value += source[i];
    i++;
  }
  return { value, next: i };
}

/**
 * Read a `{...}` group, skipping strings so nested braces stay balanced.
 * @param {string} source
 * @param {number} open index of `{`
 */
function readBalanced(source, open) {
  let depth = 0;
  let i = open;
  let text = '';
  while (i < source.length) {
    const c = source[i];
    if (c === "'" || c === '"' || c === '`') {
      const read =
        c === '`'
          ? readTemplate(source, i, new Map())
          : readQuoted(source, i, c);
      text += source.slice(i, read.next);
      i = read.next;
      continue;
    }
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return { text, next: i + 1 };
    }
    text += c;
    i++;
  }
  return { text, next: i };
}

/**
 * Replace comments with spaces. Strings and templates stay intact.
 * @param {string} source
 */
function stripTsComments(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const n = source[i + 1];
    if (c === '/' && n === '/') {
      i += 2;
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/'))
        i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"') {
      const read = readQuoted(source, i, c);
      out += source.slice(i, read.next);
      i = read.next;
      continue;
    }
    if (c === '`') {
      const read = readTemplate(source, i, new Map());
      out += source.slice(i, read.next);
      i = read.next;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function main() {
  const report = analyzeCssUsage(ROOT);
  if (report.unused.length === 0 && report.missing.length === 0) {
    console.log('css-usage: 0 unused classes, 0 ts classes without a rule');
    return;
  }
  if (report.unused.length) {
    console.error(`unused css (${report.unused.length}):`);
    for (const name of report.unused) console.error(name);
  }
  if (report.missing.length) {
    console.error(`ts without css (${report.missing.length}):`);
    for (const name of report.missing) console.error(name);
  }
  process.exitCode = 1;
}

const invoked =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invoked) main();
