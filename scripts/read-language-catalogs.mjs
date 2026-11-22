import fs from 'node:fs';
import path from 'node:path';

/** Reads languages/<code>.json. The filename, without .json, is the locale code. */
export function readLanguageCatalogs(dir) {
  const catalogs = {};
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) {
      continue;
    }
    const code = name.slice(0, -'.json'.length);
    catalogs[code] = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  }
  return catalogs;
}
