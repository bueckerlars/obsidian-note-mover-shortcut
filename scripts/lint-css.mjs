// Checks styles.css for what the Obsidian review scanner reports.
// Usage: node scripts/lint-css.mjs [file]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BANNED = [
  [
    /:has\(/,
    'Avoid :has: it slows down selector invalidation. Add a class instead.',
  ],
  [
    /display\s*:\s*contents/,
    'display: contents is only partly supported. Restructure the markup.',
  ],
  [
    /clip-path\s*:/,
    'clip-path is only partly supported. Use clip: rect(0 0 0 0).',
  ],
  [
    /(^|[\s;{])(column-gap|column-count|column-width|columns)\s*:/,
    'Multicolumn properties are only partly supported. Use gap.',
  ],
];

/** Replaces comments with spaces so line numbers stay the same. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
}

/** Splits a declaration block on ';' outside parentheses and quotes. */
function declarations(body) {
  const out = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ';' && depth === 0) {
      out.push([start, body.slice(start, i)]);
      start = i + 1;
    }
  }
  out.push([start, body.slice(start)]);
  return out;
}

/** Returns [{ line, message }] for one stylesheet. */
export function lintCss(source) {
  const css = stripComments(source);
  const findings = [];
  const lineAt = index => css.slice(0, index).split('\n').length;

  for (const [pattern, message] of BANNED) {
    const re = new RegExp(pattern.source, 'g');
    for (const match of css.matchAll(re)) {
      findings.push({ line: lineAt(match.index), message });
    }
  }

  // Leaf blocks hold declarations; nested at-rules contain further blocks.
  for (const match of css.matchAll(/\{([^{}]*)\}/g)) {
    const bodyStart = match.index + 1;
    const seen = new Map();
    for (const [offset, decl] of declarations(match[1])) {
      const colon = decl.indexOf(':');
      if (colon < 0) continue;
      const property = decl.slice(0, colon).trim().toLowerCase();
      if (!property || property.startsWith('--')) continue;
      if (seen.has(property)) {
        findings.push({
          line: lineAt(bodyStart + offset + decl.search(/\S/)),
          message: `Duplicate "${property}" in one block.`,
        });
      }
      seen.set(property, true);
    }
  }
  return findings.sort((a, b) => a.line - b.line);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const file = process.argv[2] ?? path.join(root, 'styles.css');
  const findings = lintCss(fs.readFileSync(file, 'utf8'));
  for (const { line, message } of findings) {
    console.error(`${path.relative(root, file)}:${line}  ${message}`);
  }
  if (findings.length > 0) process.exit(1);
  console.log('CSS lint: no findings');
}
