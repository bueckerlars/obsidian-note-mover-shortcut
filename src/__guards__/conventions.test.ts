import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'generated' || entry.name === 'node_modules') {
        continue;
      }
      files.push(...sourceFiles(full));
      continue;
    }
    if (entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

function relative(file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}

function allowlist(): Set<string> {
  const text = fs.readFileSync(
    path.join(root, 'scripts/style-allowlist.txt'),
    'utf8'
  );
  const paths = new Set<string>();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const file = trimmed.split(/\s+/)[0];
    if (file) {
      paths.add(file);
    }
  }
  return paths;
}

describe('phase 1–3 source conventions', () => {
  const src = path.join(root, 'src');
  const production = sourceFiles(src).filter(
    file => !file.endsWith('.test.ts')
  );

  it('keeps inline style writes out of src except the allowlist', () => {
    const allowed = allowlist();
    const pattern = /style\.setProperty|\.style\.[a-zA-Z]+ *=/;
    const hits = sourceFiles(src)
      .filter(file => !allowed.has(relative(file)))
      .flatMap(file => {
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        return lines.flatMap((line, index) =>
          pattern.test(line)
            ? [`${relative(file)}:${index + 1}: ${line.trim()}`]
            : []
        );
      });
    expect(hits).toEqual([]);
  });

  it('keeps console calls in the debug helper and behind the flag', () => {
    const pattern = /console\.(log|warn|error|debug)/;
    const hits = [...production, path.join(root, 'main.ts')].flatMap(file => {
      if (relative(file) === 'src/utils/debug.ts') {
        return [];
      }
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      return lines.flatMap((line, index) =>
        pattern.test(line)
          ? [`${relative(file)}:${index + 1}: ${line.trim()}`]
          : []
      );
    });
    expect(hits).toEqual([]);

    const debug = fs.readFileSync(path.join(src, 'utils/debug.ts'), 'utf8');
    expect(debug).not.toMatch(/console\.log/);
    for (const method of ['warn', 'error', 'debug']) {
      expect(debug).toMatch(
        new RegExp(`if \\(debugEnabled\\) \\{\\s*console\\.${method}\\(`)
      );
    }
  });

  it('does not read the window size or start window timers', () => {
    const pattern = /window\.(innerWidth|setTimeout|setInterval)/;
    const hits = sourceFiles(src).flatMap(file => {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      return lines.flatMap((line, index) =>
        pattern.test(line)
          ? [`${relative(file)}:${index + 1}: ${line.trim()}`]
          : []
      );
    });
    expect(hits).toEqual([]);
  });

  it('scopes mobile rules to body.is-mobile', () => {
    const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
    const hits = css
      .split('\n')
      .flatMap((line, index) =>
        /^\.is-mobile|[ ,]\.is-mobile/.test(line)
          ? [`styles.css:${index + 1}: ${line.trim()}`]
          : []
      );
    expect(hits).toEqual([]);
  });

  it('keeps emoji out of production source', () => {
    const pattern = /[\u{1F300}-\u{1FAFF}]/u;
    const hits = production.flatMap(file => {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      return lines.flatMap((line, index) =>
        pattern.test(line)
          ? [`${relative(file)}:${index + 1}: ${line.trim()}`]
          : []
      );
    });
    expect(hits).toEqual([]);
  });
});
