import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLanguageCatalogs } from './read-language-catalogs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default readLanguageCatalogs(path.join(root, 'languages'));
