# Obsidian-Standards für Plugin-Entwicklung und UI-Styling (Recherche)

Stand der Recherche: 2026-11-21. Alle Aussagen stammen aus den unten genannten Quellen. Was nicht belegt werden konnte, ist ausdrücklich als **unsicher / nicht belegt** markiert.

## 1. Quellen

| #   | Quelle                                                                 | URL                                                                                                               | Status beim Abruf                                                                                |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | AGENTS.md des Sample-Plugins (wörtlich, siehe Abschnitt 2)             | https://raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/AGENTS.md                              | abgerufen (curl, Rohdatei)                                                                       |
| 2a  | Sample-Plugin `package.json`                                           | https://raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/package.json                           | abgerufen                                                                                        |
| 2b  | Sample-Plugin `eslint.config.mts`                                      | https://raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/eslint.config.mts                      | abgerufen                                                                                        |
| 2c  | Sample-Plugin `esbuild.config.mjs`                                     | https://raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/esbuild.config.mjs                     | abgerufen                                                                                        |
| 2d  | Sample-Plugin `tsconfig.json`                                          | https://raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/tsconfig.json                          | abgerufen                                                                                        |
| 2e  | Sample-Plugin `styles.css`                                             | https://raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/styles.css                             | abgerufen (nur Kommentar-Platzhalter)                                                            |
| 2f  | Sample-Plugin `manifest.json`                                          | https://raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/manifest.json                          | abgerufen                                                                                        |
| 3a  | Plugin guidelines                                                      | https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines                                                      | abgerufen                                                                                        |
| 3b  | Submission requirements for plugins                                    | https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins                                    | **nicht abrufbar (404)**                                                                         |
| 3c  | Validierungs-Workflow (Community-Katalog)                              | https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/.github/workflows/validate-plugin-entry.yml | **nicht abrufbar (404)**, nur über AGENTS.md referenziert                                        |
| 4a  | CSS variables (Übersicht)                                              | https://docs.obsidian.md/Reference/CSS+variables/CSS+variables                                                    | abgerufen                                                                                        |
| 4b  | CSS variables: Colors                                                  | https://docs.obsidian.md/Reference/CSS+variables/Foundations/Colors                                               | abgerufen                                                                                        |
| 4c  | CSS variables: Spacing                                                 | https://docs.obsidian.md/Reference/CSS+variables/Foundations/Spacing                                              | abgerufen                                                                                        |
| 4d  | CSS variables: Icons                                                   | https://docs.obsidian.md/Reference/CSS+variables/Foundations/Icons                                                | abgerufen                                                                                        |
| 4e  | CSS variables: Buttons                                                 | https://docs.obsidian.md/Reference/CSS+variables/Components/Buttons                                               | **nicht abrufbar (404)**                                                                         |
| 4f  | CSS variables: Inputs                                                  | https://docs.obsidian.md/Reference/CSS+variables/Components/Inputs                                                | **nicht abrufbar (404)**                                                                         |
| 4g  | Settings (UI)                                                          | https://docs.obsidian.md/Plugins/User+interface/Settings                                                          | abgerufen                                                                                        |
| 4h  | Modals                                                                 | https://docs.obsidian.md/Plugins/User+interface/Modals                                                            | abgerufen                                                                                        |
| 4i  | HTML elements                                                          | https://docs.obsidian.md/Plugins/User+interface/HTML+elements                                                     | abgerufen (Teilinhalt)                                                                           |
| 4j  | Mobile development                                                     | https://docs.obsidian.md/Plugins/Getting+started/Mobile+development                                               | abgerufen (alternative Pfad-Variante; die Pfad-Variante unter `Plugins/User+interface/` ist 404) |
| 4k  | Style guide                                                            | https://obsidian.md/help/style-guide (Weiterleitung von help.obsidian.md)                                         | abgerufen                                                                                        |
| 5   | npm-Registry: `eslint-plugin-obsidianmd` (latest), `obsidian` (latest) | https://registry.npmjs.org/eslint-plugin-obsidianmd/latest, https://registry.npmjs.org/obsidian/latest            | abgerufen                                                                                        |

Hinweis zur Abdeckung: Die Seiten zu Submission requirements, Buttons, Inputs und dem allgemeinen Mobile-Abschnitt unter `Plugins/User+interface/` waren nicht abrufbar. Die Aussagen zu Buttons, Inputs, Accessibility und Mobile-CSS-Klassen sind deshalb nicht belegt.

## 2. AGENTS.md des Sample-Plugins (wörtlich)

Quelle: https://raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/AGENTS.md (Rohdatei, 1:1 übernommen, Stand des Abrufs).

````markdown
# Obsidian community plugin

## Project overview

- Target: Obsidian Community Plugin (TypeScript → bundled JavaScript).
- Entry point: `src/main.ts` compiled to `main.js` and loaded by Obsidian.
- Required release artifacts: `main.js`, `manifest.json`, and optional `styles.css`.

## Environment & tooling

- Node.js: use current LTS (Node 18+ recommended).
- **Package manager: npm** (required for this sample - `package.json` defines npm scripts and dependencies).
- **Bundler: esbuild** (required for this sample - `esbuild.config.mjs` and build scripts depend on it). Alternative bundlers like Rollup or webpack are acceptable for other projects if they bundle all external dependencies into `main.js`.
- Types: `obsidian` type definitions.

**Note**: This sample project has specific technical dependencies on npm and esbuild. If you're creating a plugin from scratch, you can choose different tools, but you'll need to replace the build configuration accordingly.

### Install

```bash
npm install
```

### Dev (watch)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

## Linting

- ESLint is preconfigured with `eslint-plugin-obsidianmd` for Obsidian-specific rules.
- Run `npm run lint` to lint the project.
- A GitHub Action automatically lints every commit on all branches.

## File & folder conventions

- **Organize code into multiple files**: Split functionality across separate modules rather than putting everything in `main.ts`.
- Source lives in `src/`. Keep `main.ts` small and focused on plugin lifecycle (loading, unloading, registering commands).
- **Example file structure**:
  ```
  src/
    main.ts           # Plugin entry point, lifecycle management
    settings.ts       # Settings interface and defaults
    commands/         # Command implementations
      command1.ts
      command2.ts
    ui/              # UI components, modals, views
      modal.ts
      view.ts
    utils/           # Utility functions, helpers
      helpers.ts
      constants.ts
    types.ts         # TypeScript interfaces and types
  ```
- **Do not commit build artifacts**: Never commit `node_modules/`, `main.js`, or other generated files to version control.
- Keep the plugin small. Avoid large dependencies. Prefer browser-compatible packages.
- Generated output should be placed at the plugin root or `dist/` depending on your build setup. Release artifacts must end up at the top level of the plugin folder in the vault (`main.js`, `manifest.json`, `styles.css`).

## Manifest rules (`manifest.json`)

- Must include (non-exhaustive):
  - `id` (plugin ID; for local dev it should match the folder name)
  - `name`
  - `version` (Semantic Versioning `x.y.z`)
  - `minAppVersion`
  - `description`
  - `isDesktopOnly` (boolean)
  - Optional: `author`, `authorUrl`, `fundingUrl` (string or map)
- Never change `id` after release. Treat it as stable API.
- Keep `minAppVersion` accurate when using newer APIs.
- Canonical requirements are coded here: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

## Testing

- Manual install for testing: copy `main.js`, `manifest.json`, `styles.css` (if any) to:
  ```
  <Vault>/.obsidian/plugins/<plugin-id>/
  ```
- Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Commands & settings

- Any user-facing commands should be added via `this.addCommand(...)`.
- If the plugin has configuration, provide a settings tab and sensible defaults.
- Persist settings using `this.loadData()` / `this.saveData()`.
- Use stable command IDs; avoid renaming once released.

## Versioning & releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map plugin version → minimum app version.
- Create a GitHub release whose tag exactly matches `manifest.json`'s `version`. Do not use a leading `v`.
- Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release as individual assets.
- After the initial release, follow the process to add/update your plugin in the community catalog as required.

## Security, privacy, and compliance

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**. In particular:

- Default to local/offline operation. Only make network requests when essential to the feature.
- No hidden telemetry. If you collect optional analytics or call third-party services, require explicit opt-in and document clearly in `README.md` and in settings.
- Never execute remote code, fetch and eval scripts, or auto-update plugin code outside of normal releases.
- Minimize scope: read/write only what's necessary inside the vault. Do not access files outside the vault.
- Clearly disclose any external services used, data sent, and risks.
- Respect user privacy. Do not collect vault contents, filenames, or personal information unless absolutely necessary and explicitly consented.
- Avoid deceptive patterns, ads, or spammy notifications.
- Register and clean up all DOM, app, and interval listeners using the provided `register*` helpers so the plugin unloads safely.

## UX & copy guidelines (for UI text, commands, settings)

- Prefer sentence case for headings, buttons, and titles.
- Use clear, action-oriented imperatives in step-by-step copy.
- Use **bold** to indicate literal UI labels. Prefer "select" for interactions.
- Use arrow notation for navigation: **Settings → Community plugins**.
- Keep in-app strings short, consistent, and free of jargon.

## Performance

- Keep startup light. Defer heavy work until needed.
- Avoid long-running tasks during `onload`; use lazy initialization.
- Batch disk access and avoid excessive vault scans.
- Debounce/throttle expensive operations in response to file system events.

## Coding conventions

- TypeScript with `"strict": true` preferred.
- **Keep `main.ts` minimal**: Focus only on plugin lifecycle (onload, onunload, addCommand calls). Delegate all feature logic to separate modules.
- **Split large files**: If any file exceeds ~200-300 lines, consider breaking it into smaller, focused modules.
- **Use clear module boundaries**: Each file should have a single, well-defined responsibility.
- Bundle everything into `main.js` (no unbundled runtime deps).
- Avoid Node/Electron APIs if you want mobile compatibility; set `isDesktopOnly` accordingly.
- Prefer `async/await` over promise chains; handle errors gracefully.

## Mobile

- Where feasible, test on iOS and Android.
- Don't assume desktop-only behavior unless `isDesktopOnly` is `true`.
- Avoid large in-memory structures; be mindful of memory and storage constraints.

## Agent do/don't

**Do**

- Add commands with stable IDs (don't rename once released).
- Provide defaults and validation in settings.
- Write idempotent code paths so reload/unload doesn't leak listeners or intervals.
- Use `this.register*` helpers for everything that needs cleanup.

**Don't**

- Introduce network calls without an obvious user-facing reason and documentation.
- Ship features that require cloud services without clear disclosure and explicit opt-in.
- Store or transmit vault contents unless essential and consented.

## Common tasks

### Organize code across multiple files

**main.ts** (minimal, lifecycle only):

```ts
import { Plugin } from 'obsidian';
import { MySettings, DEFAULT_SETTINGS } from './settings';
import { registerCommands } from './commands';

export default class MyPlugin extends Plugin {
  settings!: MySettings;

  async onload() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<MySettings>
    );
    registerCommands(this);
  }
}
```

**settings.ts**:

```ts
export interface MySettings {
  enabled: boolean;
  apiKey: string;
}

export const DEFAULT_SETTINGS: MySettings = {
  enabled: true,
  apiKey: '',
};
```

**commands/index.ts**:

```ts
import { Plugin } from 'obsidian';
import { doSomething } from './my-command';

export function registerCommands(plugin: Plugin) {
  plugin.addCommand({
    id: 'do-something',
    name: 'Do something',
    callback: () => doSomething(plugin),
  });
}
```

### Add a command

```ts
this.addCommand({
  id: 'your-command-id',
  name: 'Do the thing',
  callback: () => this.doTheThing(),
});
```

### Persist settings

```ts
interface MySettings { enabled: boolean }
const DEFAULT_SETTINGS: MySettings = { enabled: true };

async onload() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MySettings>);
  await this.saveData(this.settings);
}
```

### Register listeners safely

```ts
this.registerEvent(
  this.app.workspace.on('file-open', f => {
    /* ... */
  })
);
this.registerDomEvent(activeWindow, 'resize', () => {
  /* ... */
});
this.registerInterval(
  window.setInterval(() => {
    /* ... */
  }, 1000)
);
```

## Troubleshooting

- Plugin doesn't load after build: ensure `main.js` and `manifest.json` are at the top level of the plugin folder under `<Vault>/.obsidian/plugins/<plugin-id>/`.
- Build issues: if `main.js` is missing, run `npm run build` or `npm run dev` to compile your TypeScript source code.
- Commands not appearing: verify `addCommand` runs after `onload` and IDs are unique.
- Settings not persisting: ensure `loadData`/`saveData` are awaited and you re-render the UI after changes.
- Mobile-only issues: confirm you're not using desktop-only APIs; check `isDesktopOnly` and adjust.

## References

- Obsidian sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin
- API documentation: https://docs.obsidian.md
- Developer policies: https://docs.obsidian.md/Developer+policies
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Style guide: https://help.obsidian.md/style-guide
````

## 3. Sample-Plugin: aktueller Tooling-Stand (Kurzfassung)

- **Package-Manager und Scripts** (`package.json`): npm. Scripts: `dev` (esbuild watch), `build` (`tsc -noEmit -skipLibCheck` und danach esbuild production), `lint` (`eslint .`), `version` (ruft `version-bump.mjs` auf; die Datei wurde nicht separat geprüft).
- **Module-Typ**: `"type": "module"`.
- **Dev-Dependencies**: `eslint ^9.39.4`, `@eslint/js ^9.39.4`, `typescript-eslint ^8.59.1`, `eslint-plugin-obsidianmd ^0.4.0`, `esbuild 0.25.5`, `typescript ^5.8.3`, `obsidian: latest`, `@types/node ^22.15.17`, `globals`, `jiti`.
- **Abweichung**: Der npm-Registry-Eintrag `latest` für `eslint-plugin-obsidianmd` ist 0.6.0, das Sample pinnt auf `^0.4.0`. Ob die Sample-Version bewusst zurückgehalten wird, ist **unsicher**.
- **Node-Version**: AGENTS.md nennt "current LTS (Node 18+ recommended)". Im `package.json` steht kein `engines`-Feld. Die `@types/node`-Version ist 22.
- **ESLint** (`eslint.config.mts`): Flat Config. Nutzt `obsidianmd.configs.recommended` aus `eslint-plugin-obsidianmd`, Browser-Globals, `projectService` mit `allowDefaultProject: ['eslint.config.mts', 'manifest.json']`. Ignoriert `main.js`, `esbuild.config.mjs`, `tsconfig.json`, `package*.json`, `versions.json`, `dist`, `node_modules`.
- **esbuild** (`esbuild.config.mjs`): Entry `src/main.ts`, Output `main.js`, Format `cjs`, Target `es2021`, `bundle: true`. Externals: `obsidian`, `electron`, die `@codemirror/*`- und `@lezer/*`-Pakete sowie alle Node-Builtins. Dev: Inline-Sourcemap und `watch`. Production: minify, keine Sourcemap.
- **TypeScript** (`tsconfig.json`): `strict`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `isolatedModules`, `skipLibCheck`, `moduleResolution: node`, `target ES2021`, `lib: ["ES2021", "DOM"]`, `include: ["src/**/*.ts"]`.
- **manifest.json** (Sample): `id: "sample-plugin"`, `minAppVersion: "1.0.0"`, `isDesktopOnly: false`, plus `author`, `authorUrl`, `fundingUrl`. Das Sample nennt `fundingUrl` ausdrücklich als optional.
- **styles.css**: nur ein Kommentar-Platzhalter ("If your plugin does not need CSS, delete this file.").
- **Release-Artefakte** (AGENTS.md): `main.js`, `manifest.json`, optional `styles.css`, auf oberster Ebene im Plugin-Ordner. Tag exakt gleich `version`, ohne führendes `v`.

## 4. Checkliste: Styling / CSS

Quellen: Plugin guidelines (Styling), CSS-variables-Seiten, Mobile development, AGENTS.md.

- [ ] **Keine harten Styles im Code** ("No hardcoded styling"): Styles nicht per JS setzen, sondern CSS-Klassen in `styles.css` verwenden. Klassen per `cls` (bei `createEl`) oder `toggleClass(name, bedingung)` setzen.
- [ ] **Keine inline styles** ist die Konsequenz aus dem Punkt oben. Eine explizite Regel "keine inline styles" steht in den Quellen so nicht wörtlich; die Guideline "No hardcoded styling" deckt sie inhaltlich ab.
- [ ] **Obsidian-CSS-Variablen zuerst nutzen**; eigene Variablen nur, wenn keine passende existiert (Plugin guidelines).
- [ ] **Farben**: `--color-base-00` bis `--color-base-100`, Akzent `--color-accent` (`-1`, `-2`), `--color-red` etc., `--mono-0`/`--mono-100`, semantisch `--background-*`, `--interactive-*`, `--text-*` (z. B. `--text-muted`, laut HTML-elements-Seite), `--caret-color`.
- [ ] **Farbmischung**: `-rgb`-Varianten sind seit Obsidian 1.13 veraltet. Empfohlen: `color-mix(in oklch, var(--color-red) 20%, transparent)` statt `rgba(var(--color-red-rgb), 0.2)`. Die Seite nennt Obsidian 1.13 als Stichtag; die Ableitung "ab 1.13 deprecated" ist damit direkt aus der Seite belegt.
- [ ] **Abstände und Maße**: Obsidian nutzt ein 4-px-Raster. Empfohlen: `--size-4-*` (z. B. `--size-4-2` = 8px, `--size-4-4` = 16px). `--size-2-*` nur sparsam für feinere Stufen.
- [ ] **Icons**: Größe über `--icon-size`, Strichstärke über `--icon-stroke`, Farben über Icon-Variablen, klickbare Icon-Buttons über `--clickable-icon-radius`. Standardgrößen: xs 14px, s 16px, m 18px, l 18px, xl 32px.
- [ ] **Keine `!important`**: nicht belegt (in keiner gelesenen Quelle erwähnt).
- [ ] **Namespacing der CSS-Klassen** (z. B. Präfix mit Plugin-ID): nicht belegt. Nur das Prinzip "Klassen in styles.css" ist belegt.
- [ ] **Mobile**: Die gelesene Mobile-Seite nennt keine CSS-Klasse wie `.is-mobile` oder `.is-phone`. Belegt sind: `this.app.emulateMobile(true|false)` in der Entwicklerkonsole zum Testen, `Platform.isIosApp` / `Platform.isAndroidApp` zur Plattformerkennung, `isDesktopOnly` im Manifest. Dass `.is-mobile` existiert, ist **unsicher** (in den Quellen nicht gefunden).
- [ ] **Touch-Targets / Mindestgrößen**: nicht belegt.
- [ ] **Desktop-only-Code**: Node- und Electron-APIs sind auf Mobilgeräten nicht verfügbar. Ohne Mobile-Unterstützung `isDesktopOnly: true` setzen.
- [ ] **Lookbehind in Regex** wird erst ab iOS 16.4 unterstützt (Mobile development).

## 5. Checkliste: UI-API und UI-Text

Quellen: Settings-Seite, Modals-Seite, HTML-elements-Seite, Style guide, Plugin guidelines, AGENTS.md.

### Settings

- [ ] Einstellungen über `new Setting(containerEl)` mit `setName` und `setDesc` bauen. Pro Zeile genau ein veränderbares Steuerelement (`add…`-Methoden).
- [ ] **Deklarativ oder imperativ**: Für einfache Einstellungen ist das deklarative `control` bevorzugt; Obsidian übernimmt Lesen, Schreiben und `saveData()`. Für Nebeneffekte oder eigene UI: `render`-Callback, dort `saveData()` selbst aufrufen. Nach Zustandsänderungen `this.refreshDomState()`, bei geänderter Zeilenanzahl `this.update()`.
- [ ] Einstellungen **sofort** speichern, nicht erst beim Verlassen des Tabs.
- [ ] **Überschriften**: `setHeading()` verwenden (imperativ: `new Setting(containerEl).setName(...).setHeading()`), keine `<h1>`/`<h2>`. Überschriften nur bei mehr als einem Abschnitt; allgemeine Einstellungen stehen oben ohne Überschrift.
- [ ] Keine oberste Überschrift mit "Settings", "General" oder dem Plugin-Namen.
- [ ] Das Wort "settings" in Überschriften weglassen ("Advanced", nicht "Advanced settings").
- [ ] **SettingGroup**: Die Settings-Seite beschreibt `SettingGroup` nicht. Im deklarativen Ansatz gibt es Gruppen (`type: 'group'`, Feld `heading`). Ob die imperative Klasse `SettingGroup` in der aktuellen API so existiert und wie sie heißt, ist **unsicher**; vor Verwendung in den Typen (`obsidian.d.ts`) prüfen.
- [ ] Beschreibungen (`desc`) kurz halten, am besten ein Satz.
- [ ] Listen mit Hinzufügen/Löschen/Sortieren: `type: 'list'` (deklarativ).
- [ ] Mehrzeilige Texteingaben gehören eher in ein Modal.
- [ ] Settings in `PluginSettingTab`. Für Modals wird `Setting` direkt am `contentEl` erzeugt (Settings-Seite).
- [ ] Plugin-Daten mit `loadData()` / `saveData()` persistieren, Defaults mit `Object.assign` mergen (AGENTS.md).

### Modal

- [ ] Klasse, die `Modal` erweitert; `App` im Konstruktor; Inhalt in `this.contentEl`.
- [ ] Titel mit `setTitle()`.
- [ ] Eingaben mit `Setting` in `contentEl`: z. B. `addText()` mit `onChange()`, `addButton()` mit `setButtonText()`, `setCta()`, `onClick()`.
- [ ] Auswahllisten: `SuggestModal<T>` (`getSuggestions`, `renderSuggestion`, `onChooseSuggestion`) oder `FuzzySuggestModal<T>` (`getItems`, `getItemText`, `onChooseItem`; eigene Darstellung über `renderSuggestion` und `renderResults()`).
- [ ] Öffnen mit `open()`, typischerweise aus einem Command-Callback; Schließen mit `close()`.
- [ ] Explizite Lifecycle-Hooks sind auf der Modals-Seite nicht beschrieben.
- [ ] Accessibility und Styling für Modals: nicht belegt.

### Commands

- [ ] Nutzerseitige Befehle nur über `this.addCommand(...)`, mit `id`, `name`, Callback.
- [ ] Stabile IDs; nach Release nicht mehr umbenennen (AGENTS.md).
- [ ] **Keine Standard-Hotkeys** setzen (Plugin guidelines, Konfliktgefahr).
- [ ] Callback-Typ passend wählen: `callback` (unbedingt), `checkCallback` (bedingt), `editorCallback` / `editorCheckCallback` (benötigt aktiven Markdown-Editor).
- [ ] Befehle erst nach `onload` registrieren; IDs eindeutig (AGENTS.md Troubleshooting).

### DOM-Erzeugung

- [ ] `createEl()`, `createDiv()`, `createSpan()` (laut Plugin guidelines), `setText`, `empty()`. Die HTML-elements-Seite nennt `createEl` und `cls`, nicht `createDiv` / `setText` / `empty`; diese drei sind nur über die Plugin guidelines belegt.
- [ ] **Kein** `innerHTML`, `outerHTML`, `insertAdjacentHTML` mit Nutzerdaten (Plugin guidelines, Security).
- [ ] Inhalte vor dem Neuaufbau mit `el.empty()` leeren.

### Icons

- [ ] Obsidian nutzt die **Lucide**-Bibliothek (über 800 Icons).
- [ ] `setIcon` (Aufruf im Plugin-Code): in den gelesenen Seiten **nicht belegt**.
- [ ] Im Style guide: Lucide-Icons mit Präfix `lucide-`, Obsidian-Icons mit `obsidian-icon-`, SVG 18×18, Strichstärke 1,5 (betrifft Dokumentation/Assets, nicht Plugin-Code).

### UI-Text (Style guide und Plugin guidelines)

- [ ] **Sentence case** für Überschriften, Buttons, Titel, Namen, Beschreibungen, Platzhalter (z. B. "Template folder location").
- [ ] Button- und UI-Labels in **Fett** schreiben (AGENTS.md, Style guide).
- [ ] "select" statt "click" oder "tap"; "tap" nur bei Touch-Bedienung.
- [ ] Navigation mit Pfeil: **Settings → Community plugins** (U+2192).
- [ ] "keyboard shortcut" statt "hotkey"; "note" für Markdown, "file" für andere Dateitypen; "folder" statt "directory"; "note name" statt "note title"; "perform" statt "invoke"/"execute".
- [ ] Kurze, konsistente, fachjargonfreie Strings (AGENTS.md). Imperativ in Schritt-Anleitungen.
- [ ] Richtungsangaben in Settings vermeiden, weil der Ort geräteabhängig ist (Style guide).

### Accessibility

- [ ] Die gelesenen Quellen enthalten **keine** Accessibility-Richtlinien für Plugins (auch nicht für Modals). Ob es eine separate Seite gibt, ist **unsicher**. Nur indirekt belegt: Verwendung der Obsidian-Komponenten (Setting, Modal) statt eigener Bausteine.

## 6. Checkliste: Plugin-Guidelines (allgemein)

Quelle: Plugin guidelines (Abschnitte wie auf der Seite), ergänzt um AGENTS.md.

- [ ] Globales `app` nicht verwenden, sondern `this.app`.
- [ ] Keine unnötigen `console`-Ausgaben; standardmäßig nur Fehler.
- [ ] Bei mehreren `.ts`-Dateien Ordnerstruktur nutzen (AGENTS.md empfiehlt u. a. `src/main.ts`, `settings.ts`, `commands/`, `ui/`, `utils/`, `types.ts`; `main.ts` nur Lifecycle; Dateien über ca. 200–300 Zeilen aufteilen).
- [ ] Platzhalternamen aus dem Sample umbenennen (z. B. `MyPlugin`).
- [ ] **Cleanup**: Ressourcen beim Entladen freigeben, möglichst über `registerEvent()`, `registerDomEvent()`, `registerInterval()`, `addCommand()`. Was Obsidian ohnehin entfernt, muss nicht manuell bereinigt werden.
- [ ] Leaves in `onunload` nicht lösen (Obsidian initialisiert sie bei Updates ohnehin neu).
- [ ] **Workspace**: nicht `workspace.activeLeaf` direkt nutzen; `getActiveViewOfType()` bzw. `workspace.activeEditor`. Keine Referenzen auf Custom Views speichern; `getLeavesOfType()` nutzen.
- [ ] **Vault**: Für die aktive Notiz die Editor-API statt `Vault.modify`. Für Hintergrunddateien `Vault.process` (atomar). Frontmatter über `FileManager.processFrontMatter`. Vault-API statt Adapter-API. Keine Schleifen über alle Dateien, sondern `getFileByPath`, `getFolderByPath`, `getAbstractFileByPath`. Nutzerdefinierte und erzeugte Pfade mit `normalizePath()` bereinigen.
- [ ] **Editor**: Geänderte Editor-Extensions über `updateOptions()` übernehmen, dabei dieselbe Array-Referenz behalten.
- [ ] **TypeScript**: `const`/`let` statt `var`; `async`/`await` statt `.then()`-Ketten (Plugin guidelines und AGENTS.md).
- [ ] **Netzwerk und Datenschutz** (AGENTS.md): lokal/offline-first; Netzwerkaufrufe nur wenn essentiell; kein verstecktes Telemetry; optionale Dienste mit Opt-in und Dokumentation in README und Settings; kein Remote-Code, kein Nachladen von Skripten; nur Vault-Daten lesen/schreiben, die nötig sind; keine Dateinamen/Inhalte sammeln ohne Zustimmung.
- [ ] **Keine Werbung oder Spam-Benachrichtigungen**, keine manipulativen Muster (AGENTS.md).
- [ ] **Performance** (AGENTS.md): Start schlank halten, schwere Arbeit lazy, keine langen Tasks in `onload`, Disk-Zugriffe bündeln, Dateisystem-Events debouncen/throttlen.
- [ ] **Mobile** (AGENTS.md und Mobile development): auf iOS und Android testen, wo machbar; keine Node/Electron-APIs ohne `isDesktopOnly: true`; große In-Memory-Strukturen vermeiden.
- [ ] **Manifest**: `id` nie nach Release ändern; `version` SemVer; `minAppVersion` korrekt bei neuen APIs; `isDesktopOnly` boolean. Validierung über den Workflow in obsidian-releases (nicht abrufbar, siehe Abschnitt 7).
- [ ] **Versionierung**: `versions.json` pflegen (Plugin-Version zu minAppVersion), GitHub-Release-Tag = `version` ohne `v`, Assets `manifest.json`, `main.js`, `styles.css`.
- [ ] Build-Artefakte (`main.js`) nicht committen (AGENTS.md).

## 7. Offene Punkte und Unsicherheiten

- **Submission requirements** (docs.obsidian.md) und der Validierungs-Workflow (obsidian-releases) waren nicht abrufbar. Die Anforderungen für die Community-Aufnahme sind daher **nur indirekt** über AGENTS.md und die Plugin guidelines belegt.
- **Buttons-, Inputs- und Mobile-CSS-Seiten** waren nicht abrufbar: Button-/Input-Klassen, Touch-Targets, `.is-mobile`/`.is-phone` sind **nicht belegt**.
- **Accessibility**: keine Quelle gefunden.
- **`setIcon`**, **`SettingGroup`**, **`!important`** und **Namespacing** sind nicht belegt.
- **Sample-Version**: `eslint-plugin-obsidianmd` ist im Sample auf `^0.4.0` gepinnt, `latest` im npm-Registry ist 0.6.0. Vor Übernahme der Lint-Regeln die aktuelle Version und ihre Regelliste prüfen.
- **Obsidian-Version**: `obsidian` ist im Sample `latest`; das npm-Latest war am Abruf 1.14.4. Für `minAppVersion` ist das relevant (CSS-Variable `-rgb` deprecated seit 1.13).
- **AGENTS.md selbst** verweist auf die Style-Guide-URL `help.obsidian.md/style-guide`, die auf `obsidian.md/help/style-guide` umleitet. Die Inhalte oben stammen von der umgeleiteten Seite.
- Die Aussagen auf den Docs-Seiten sind Zusammenfassungen eines Modells aus dem Seitentext (WebFetch), nicht wörtliche Zitate. Für wörtliche Zitate die Originalseiten prüfen.
