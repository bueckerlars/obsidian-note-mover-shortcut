# AGENTS.md – Advanced Note Mover

Verhaltens- und Arbeitsregeln für KI-Agenten (und Menschen) in diesem Repo.
Struktur angelehnt an die `AGENTS.md` des offiziellen
[obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin); Wortlaut des Templates siehe
`docs/analysis/01-obsidian-standards-research.md` §2.

## Projektüberblick

- Obsidian-Community-Plugin (TypeScript → gebündelt zu `main.js`), id `note-mover-shortcut`, `isDesktopOnly: false` → **Desktop und Mobile müssen funktionieren**.
- Verschiebt Notizen per Regeln (Tags, Properties, Dateinamen, Datum …), mit Preview, Blacklist-Filtern, Anhang-Mitverschiebung, Verlauf/Undo.
- Einstiegspunkt: `main.ts` (Plugin-Klasse `AdvancedNoteMoverPlugin`). Alles andere in `src/`.

## Architektur (Schichten – einhalten)

| Pfad                                                       | Zweck                                                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/domain/`                                              | Reine Logik (Filter, Canvas-Metadaten …), **keine** `obsidian`-Imports wenn vermeidbar |
| `src/core/`                                                | Regel-Matching, Caches, Mover, Trigger                                                 |
| `src/application/`                                         | Services (Move, History, Preview) – orchestrieren Core + Infrastruktur                 |
| `src/infrastructure/`                                      | Persistenz (`data.json`), Vault-Event-Hooks                                            |
| `src/settings/`                                            | Settings-Tab, Sections (`sections/*SettingsSection.ts`), Suggester                     |
| `src/modals/`                                              | Modals (`BaseModal` erweitern), Rule-Editor inkl. Mobile-View                          |
| `src/handlers/`, `src/utils/`, `src/types/`, `src/config/` | Command-Handler, Helfer, Typen, Konstanten                                             |
| `src/generated/`                                           | **Generiert** (Changelog) – nicht von Hand editieren                                   |
| `docs/`                                                    | Nutzerdoku; `docs/analysis/` Analysen & Screenshots                                    |

Regeln: Neue Logik in die tiefste passende Schicht; UI-Dateien klein halten (Sections/Komponenten statt Mega-Dateien); keine Geschäftslogik in Modals.

## Environment & Tooling

- Node: aktuelle LTS (Template: 18+; CI/Dev nutzt neuere). Paketmanager: **npm** (nicht mischen).
- `npm install` · `npm run dev` (esbuild watch) · `npm run build` (generate-changelog + `tsc -noEmit` + production bundle)
- Qualität: `npm run lint` (eslint + `eslint-plugin-obsidianmd`), `npm run format:check`, `npm run type-check`, `npm test` (vitest)
- Pre-commit: husky + nano-staged (lint/format auf gestagten Dateien). Hooks nicht umgehen (`--no-verify` verboten).
- Vor jedem PR: `npm run lint && npm run type-check && npm test && npm run build` müssen grün sein.
- Build-Artefakte (`main.js`) nur committen, wenn der Release-Prozess es verlangt; sonst nicht von Hand ändern.

## Dateien & Ordner

- Release-Artefakte liegen im Plugin-Root: `main.js`, `manifest.json`, `styles.css`.
- `manifest.json`: `id` nie ändern; `minAppVersion` nur anheben, wenn neue API genutzt wird; Version nur via `npm version` (`version-bump.mjs` schreibt `manifest.json` + `versions.json`). Git-Tag = Version **ohne** `v`.
- Changelog: neuer Eintrag in `scripts/generate-changelog.ts`/`CHANGELOG.md`, `src/generated/` wird daraus erzeugt.

## Obsidian-Standards (Pflicht)

**Sicherheit / Compliance**

- Kein `innerHTML`/`outerHTML`/`insertAdjacentHTML` mit dynamischen Daten; DOM über `createEl`/`createDiv`/`setText`.
- Keine Netzwerk-Calls, Telemetrie oder Remote-Code ohne ausdrücklichen Opt-in und Doku.
- Nur Vault-Inhalte anfassen, die für die Funktion nötig sind. Verschieben **immer** via `app.fileManager.renameFile` (hält Links aktuell), Löschen via `app.fileManager.trashFile`.
- Prefer `app.vault` API gegenüber `app.vault.adapter`; Pfade mit `normalizePath` normalisieren.

**Lifecycle**

- Alles Registrieren über `this.registerEvent`, `this.registerDomEvent`, `this.registerInterval`, `this.addCommand` – damit `onunload` sauber aufräumt. Kein Event-Leak, keine globalen Listener ohne Cleanup.
- Schwere Arbeit nicht in `onload` blockierend; Vault-Scans erst nach `app.workspace.onLayoutReady`.

**Commands**

- Stabile IDs (nie umbenennen, Nutzer-Hotkeys hängen daran). **Keine Default-Hotkeys.**
- Command-Namen **ohne** Plugin-Namen-Präfix (Obsidian ergänzt ihn selbst). `checkCallback`/`editorCheckCallback` nutzen, wenn ein Command nur kontextabhängig verfügbar ist.

**UI-Texte (UX)**

- **Sentence case** für alle Überschriften, Buttons, Labels, Commands („Add new filter“, nicht „Add New Filter“; „Rule editor“, nicht „Rule Editor“).
- Kurz, handlungsorientiert, Präsens; keine Doppelpunkte am Ende von Überschriften; keine Emojis als Ersatz für Icons in Titeln.
- Settings-Überschriften mit `new Setting(el).setName('…').setHeading()`, **nicht** `h1/h2/h3`; keine Überschrift mit dem Plugin-Namen im Tab.
- Plural korrekt behandeln („1 file“, „2 files“).
- Texte stehen zentral/auffindbar (Vorbereitung für i18n), nicht verstreut als Literale.

**Styling (siehe `docs/analysis/` für Befunde)**

- Keine festen Styles in TS (`el.style.*`); stattdessen CSS-Klassen. Dynamische Werte: `setCssProps`/`setCssStyles`.
- Alle Klassen mit Plugin-Präfix `advancedNoteMover-`/`anm-` (einheitlich wählen) und **nie** Obsidian-Kernklassen (`.setting-item`, `.modal`, `.checkbox-container` …) global überschreiben – immer unter einer eigenen Wurzelklasse scopen.
- **Obsidian-CSS-Variablen** statt Hardcodes: Farben `--background-*`, `--text-*`, `--interactive-*`, `--background-modifier-*`; Abstände `--size-4-*`; Radien `--radius-s/m/l`; Schrift `--font-ui-*`, `--font-text-size`. Keine Hex/rgb-Werte, kein `!important`.
- Native Komponenten bevorzugen (`Setting`, `ButtonComponent`, `ToggleComponent`, `setIcon` mit Lucide-Icon-Namen); eigenes Chrome nur, wo es keine native Entsprechung gibt.
- Light **und** Dark sowie Fremd-Themes testen. Kontrast ≥ 4.5:1.

**Mobile (Pflicht-Check bei jeder UI-Änderung)**

- Prüfen mit `app.emulateMobile(true)` (Phone ≈ 390×844) **und** Desktop. Mobile-Layouts über `body.is-mobile`/`.is-phone` Selektoren, nicht nur `@media`.
- Touch-Ziele ≥ 44×44 px; Toggles/Buttons in `Setting` bleiben rechts neben dem Text (Obsidian-Standardlayout nicht zerstören).
- Kein Hover-only-Feature; Drag&Drop braucht Touch-Alternative (z. B. „Nach oben/unten“-Menü).
- Modals auf Phone: Aktionsleiste (Speichern/Abbrechen) sichtbar/sticky, Inhalt scrollt.

**Accessibility**

- Icon-Buttons haben `aria-label` (+ Tooltip); alles per Tastatur erreichbar (Tab, Enter/Space, Esc schließt Modals); sichtbarer Fokus (`:focus-visible`); keine reine Farb-Kodierung.

## Performance

- Teure Auswertung cachen (vorhandene `RuleEvaluationCache`, Vault-Index-Cache nutzen statt neu bauen).
- Metadaten über `metadataCache` lesen, Dateiinhalt nur lesen, wenn eine Regel es wirklich braucht (`filtersNeedContent`).
- Event-Handler debouncen (`DebounceManager`); keine Vollscans pro Tastendruck/Edit.

## Tests

- Vitest (`npm test`). Neue Logik in `core/`, `domain/`, `application/`, `utils/` bekommt Unit-Tests neben der Datei (`*.test.ts`). Obsidian-Klassen über `src/test-utils/` mocken.
- Bugfix → zuerst reproduzierenden Test schreiben.
- UI-Änderungen: manuell in Obsidian prüfen (Desktop + Mobile-Emulation), Screenshots im PR.

## Git & PRs

- Branches: `feat/…`, `fix/…`, `docs/…`, `refactor/…`, `test/…`, `chore/…`; PR gegen `main`.
- Conventional-Commit-Präfixe, Imperativ, erste Zeile < 72 Zeichen.
- PR-Beschreibung: Was/Warum, `Closes #…`, Teststrategie, Screenshots bei UI.
- Keine Secrets/`data.json` mit Nutzerdaten committen.

## Agent do / don't

**Do**

- Kleine, fokussierte Änderungen; bestehende Muster und Schichten wiederverwenden.
- Vorher Aufrufer greppen (Bugfix an der Wurzel in geteiltem Code, nicht pro Aufrufer).
- Nutzer-Settings abwärtskompatibel migrieren (`PluginDataRootSchema`, Loader in `infrastructure/persistence`); nie stillschweigend Daten verwerfen.
- Destruktive Aktionen (Verschieben, Verlauf löschen, Import) mit Bestätigung/Undo absichern.
- Bei UI-Arbeit Screenshot Desktop + Mobile erstellen (Vorgehen: `docs/analysis/README.md`).

**Don't**

- Keine neuen Abhängigkeiten für Kleinigkeiten; kein Bundle-Bloat.
- Keine Dateien außerhalb des Repos/Vaults anfassen; keine Netzwerkzugriffe einbauen.
- Keine `any`-Casts auf Obsidian-Interna, wenn es eine offizielle API gibt; undokumentierte APIs nur mit Kommentar `shortcut:`/Begründung und Fallback.
- Kein `console.log` im Produktionspfad (Debug nur hinter Performance-/Debug-Setting).
- Keine generierten Dateien (`src/generated/`, `main.js`) von Hand ändern.

## Referenzen

- Sample-Plugin: https://github.com/obsidianmd/obsidian-sample-plugin
- Plugin-Guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- CSS-Variablen: https://docs.obsidian.md/Reference/CSS+variables/CSS+variables
- API-Doku: https://docs.obsidian.md · Typen: `node_modules/obsidian/obsidian.d.ts`
- Lint-Regeln: https://github.com/obsidianmd/eslint-plugin
