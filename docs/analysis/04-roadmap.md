# Roadmap – alle Findings beseitigen

Grundlage: `02-findings.md` (VIS-01…08, CSS-01…20, UI-01…43) und `03-improvement-proposals.md`.
Jede Phase = ein Branch/PR-Block, der **nur dann** als fertig gilt, wenn sein **Gate** grün ist. Phasen sind in Reihenfolge abzuarbeiten (Abhängigkeiten stehen dabei). Aufwand: S <1h · M <1 Tag · L mehrere Tage.

## Globale Regeln

**Definition of Done (gilt für jede Phase, zusätzlich zum phasenspezifischen Gate)**

- `npm run lint && npm run format:check && npm run type-check && npm test && npm run build` grün.
- Keine neuen Lint-Ausnahmen (`eslint-disable`), außer begründet im PR.
- UI-Änderung ⇒ Screenshots Desktop **und** Mobile im PR (Vorgehen `docs/analysis/README.md`), Vorher/Nachher.
- `CHANGELOG`-Eintrag (`scripts/generate-changelog.ts`) bei nutzersichtbarer Änderung.
- Settings-Schema-Änderungen nur mit Migration + Test (AGENTS.md).

**Gate-Typen**

- **[A] Automatisch** – Befehl/Test, der exit 0 liefern muss (CI-fähig).
- **[S] Smoke** – `npm run ui:smoke` (Phase 0 liefert das Skript): öffnet jeden Screen Desktop+Mobile per CDP, schreibt Screenshots nach `docs/analysis/screenshots/<phase>/` und prüft DOM-Assertions.
- **[M] Manuell** – feste Checkliste, im PR abgehakt (Reviewer verifiziert Screenshot).

**Bezugs-Befehle** (in Gates verwendet; `$P` = Plugin-Root)

```bash
grep -rn "PATTERN" src main.ts styles.css   # "darf 0 Treffer liefern" = Gate
npx vitest run <datei>                      # einzelne Testdatei
```

---

## Phase 0 – Sicherheitsnetz & Tooling _(Voraussetzung für alles, ~M)_

**Ziel:** Messbare Baseline, damit spätere Gates objektiv prüfbar sind.

| Task | Inhalt                                                                                                                                                                                                                                                                                                                                                                                  | Finding        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 0.1  | Baseline festhalten: `npm run lint/type-check/test/build` ausführen, Ergebnis + Testanzahl in `docs/analysis/baseline.md`                                                                                                                                                                                                                                                               | –              |
| 0.2  | `docs/analysis/tools/cdp.mjs` zu `scripts/ui-smoke.mjs` ausbauen: Test-Vault-Fixture (`scripts/fixtures/vault/`), startet isolierte Obsidian-Instanz (`--user-data-dir`, Debug-Port), öffnet jeden Screen (9 Settings-Sektionen, Rule-Editor, History, Preview, Conflict-Cache, Confirm, Update/Changelog) in Desktop (1400×1100) und Mobile (`emulateMobile`, 390×844), speichert PNGs | –              |
| 0.3  | Smoke-Assertions implementieren (je Screen): (a) keine Buttons/Klickziele <44 px im Mobile-Modus, (b) jeder `.clickable-icon`/Icon-Button hat `aria-label`, (c) kein Element mit Inline-`style`-Attribut aus Plugin-Klassen, (d) keine Konsole-Errors, (e) Modal hat `.modal-title`, (f) kein horizontaler Overflow (`scrollWidth ≤ clientWidth`)                                       | alle visuellen |
| 0.4  | `package.json`: Scripts `ui:smoke`, `check:dead` (knip/ts-prune für TS, siehe 2.1 für CSS); `eslint-plugin-obsidianmd` auf ≥ Template-Version heben; neue Lint-Treffer als Liste in `baseline.md` (werden in Phasen 1–3 abgearbeitet, nicht pauschal unterdrückt)                                                                                                                       | T2             |
| 0.5  | CONTRIBUTING: Node-Version aktualisieren, auf `AGENTS.md` und UI-Smoke verweisen                                                                                                                                                                                                                                                                                                        | T1             |
| 0.6  | Optional CI (GitHub Action): lint, type-check, test, build; `ui:smoke` manuell/nightly (braucht Obsidian-Binary)                                                                                                                                                                                                                                                                        | –              |

**Gate Phase 0**

- [A] `npm run lint && npm run type-check && npm test && npm run build` grün (Baseline reproduzierbar).
- [S] `npm run ui:smoke` läuft auf sauberem Checkout durch, erzeugt ≥ 24 PNGs (12 Screens × 2 Modi) und gibt eine Tabelle „Assertion × Screen“ aus. **Erwartung zu diesem Zeitpunkt: bekannte Findings schlagen fehl** (z. B. fehlende `aria-label`, <44 px) – die Liste wird als `baseline-smoke.json` eingecheckt und ist der Rot→Grün-Fahrplan für die Phasen 1–7.
- [A] Smoke-Skript hat selbst einen Test (`scripts/ui-smoke.test.ts`) für die Assertion-Funktionen auf Mock-DOM (jsdom).

---

## Phase 1 – Robustheit & Datenintegrität (Bugs) _(~M, hohe Priorität)_

**Ziel:** Alle funktionalen Fehler aus der Code-Analyse beheben, jeweils mit Regressionstest.

| Task | Inhalt                                                                                                                                                               | Finding      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1.1  | Import: Dateidialog-Abbruch (`cancel`/`focus`-Fallback) auflösen, Button wieder aktivieren; Validierung des Imports gegen Schema (`valibot`), klare Fehlermeldung    | UI-01        |
| 1.2  | ConflictSkipCacheModal: Titel überlebt `refreshContent` (Titel außerhalb von `contentEl` oder neu rendern)                                                           | UI-06        |
| 1.3  | `PropertySuggest` & alle Suggest-Instanzen: `destroy()` bei Re-Render/`onClose`; `metadataCache`-Listener nur über `plugin.registerEvent`/zentrales Lifecycle-Objekt | UI-07, UI-43 |
| 1.4  | `BaseModal`: Größen per CSS-Klassen (`advancedNoteMover-modal-size-*` existiert) statt `style.setProperty(…,'important')`                                            | UI-08        |
| 1.5  | Intervall-Eingabe: `Number.isInteger`, Min/Max, Debounce; Timer nur bei geändertem, gültigem Wert neu starten                                                        | UI-27        |
| 1.6  | Plural-Helper `pluralize(n, 'file')` zentral (`src/utils/`), überall einsetzen („1 files“)                                                                           | UI-17        |
| 1.7  | `window.*` → `activeWindow`/`activeDocument`; `window.innerWidth` → Platform/Container-Größe                                                                         | UI-34        |
| 1.8  | `console.*` im UI-Code entfernen oder hinter Debug-Setting; Plugin-Name aus Notice-Titeln/Ribbon-Tooltip entfernen (Obsidian zeigt den Plugin-Namen selbst)          | UI-33, UI-32 |
| 1.9  | Trace-Export: Blob-Download (oder `showSaveFilePicker`-Fallback) statt `vault.adapter.write` ins Vault                                                               | UI-35        |
| 1.10 | Hartkodierte Debug-Version entfernen (Version aus `manifest`), Release-Notes über Command erneut öffnen                                                              | UI-26        |
| 1.11 | Klonen von Regeln vereinheitlichen (ein `cloneRule()` mit Test; Name „… copy“, neue ID falls vorhanden)                                                              | UI-31        |
| 1.12 | Statt „Check console for details“: konkrete Fehlermeldung + Bündelung von Bulk-Notices zu einer Zusammenfassung (mit Anzahl Fehler und „Show details“)               | UI-13, UI-14 |

**Gate Phase 1**

- [A] Neue Unit-Tests (je Task eine Datei neben dem Code):
  - `pluralize.test.ts`: 0/1/2 → „0 files/1 file/2 files“.
  - `importSettings.test.ts`: Abbruch → Promise resolved `null`, Button-State zurückgesetzt (jsdom); ungültiges JSON → Fehlermeldung, Settings unverändert.
  - `intervalInput.test.ts`: `"abc"`, `"0"`, `"-5"`, `"1.5"`, `"1000000"` werden abgelehnt; gültiger Wert startet Timer genau 1×.
  - `suggestLifecycle.test.ts`: n× Re-Render ⇒ Anzahl registrierter `metadataCache`-Listener bleibt konstant (Spy auf `on/offref`).
  - `cloneRule.test.ts`.
- [A] `grep -rnE "style\.setProperty|\.style\.[a-zA-Z]+ *=" src` → **0 Treffer** außerhalb einer expliziten Allowlist (`scripts/style-allowlist.txt`, jede Zeile begründet).
- [A] `grep -rnE "console\.(log|warn|error|debug)" src main.ts` → nur in `src/utils/debug*.ts` (hinter Debug-Flag).
- [A] `grep -rn "window\.\(innerWidth\|setTimeout\|setInterval\)" src` → 0.
- [S] Conflict-Cache-Modal: nach „Dismiss“, „Remove stale“, „Clear all“ ist `.modal-title` vorhanden (Assertion e).
- [M] Import-Dialog öffnen → ESC im Dateidialog → Button wieder klickbar (Screenshot).

---

## Phase 2 – CSS-Hygiene _(~M)_

**Ziel:** Kleine, saubere, korrekt gescopte `styles.css`; Mobile über `body.is-mobile`.

| Task | Inhalt                                                                                                                                                                                                                                                                                                                                                                | Finding                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 2.1  | **Toter CSS**: Skript `scripts/check-css-usage.mjs` liest alle Klassen aus `styles.css` und prüft Literal- **und** `CLS`-Template-Verwendung in `src/`+`main.ts` (Whitelist für dynamisch gebaute Präfixe); danach 46 tote Klassen/~460 Zeilen löschen (Ausnahmen laut Report: `rule-mobile-*`, `mobile-rule-actions`, `mobile-toggle-control`, `mobile-move-button`) | CSS-01, CSS-18, CSS-19 |
| 2.2  | `[class*='noteMover']`-Selektoren durch explizite Scopes ersetzen                                                                                                                                                                                                                                                                                                     | CSS-03                 |
| 2.3  | Mobile-Regeln von `@media (max-width)` auf `body.is-mobile` (bzw. `.is-phone`) umstellen; `@media` nur für echte Fensterformate mit Kommentar; `.is-mobile` → `body.is-mobile` (55 Stellen)                                                                                                                                                                           | CSS-02, CSS-10         |
| 2.4  | Modal-Titel/Untertitel: eine Quelle je Zustand (`--anm-modal-title-size`), 4 konkurrierende Blöcke löschen; Changelog-Typografie-Duplikate zusammenführen                                                                                                                                                                                                             | CSS-04, CSS-09         |
| 2.5  | Touch-Ziele: Segment-Buttons `min-height: var(--anm-rule-mobile-touch)`                                                                                                                                                                                                                                                                                               | CSS-05                 |
| 2.6  | Variablen: `box-shadow: var(--shadow-l)`, `--background-modifier-active` gegen Obsidian prüfen/ersetzen; `white` entfällt mit 2.1                                                                                                                                                                                                                                     | CSS-06, CSS-07         |
| 2.7  | Technik: `transition: all` → explizit; `-webkit-overflow-scrolling` löschen; `100vh` → `100vh` + `100dvh`; Opacity-gedimmte Texte → `color: var(--text-muted)`                                                                                                                                                                                                        | CSS-15, 16, 17, 20     |
| 2.8  | Tokens: `border-radius`→`--radius-s/m/l`, Font→`--font-ui-*`, Abstände→`--size-2/4-*` (Mobile-Bereich zuerst, dann Rest); `16px`-iOS-Ausnahmen kommentiert                                                                                                                                                                                                            | CSS-11, 12, 13, 14     |
| 2.9  | Prefix vereinheitlichen: `note-mover-{preview,update,history}-modal` → `advancedNoteMover-*` (TS + CSS gemeinsam), Changelog-Hinweis für Custom-Snippets                                                                                                                                                                                                              | CSS-08                 |

**Gate Phase 2**

- [A] `node scripts/check-css-usage.mjs` → 0 ungenutzte Klassen, 0 Klassen in TS ohne CSS-Regel (oder explizit in Allowlist).
- [A] `grep -nE "!important|\[class\*=|-webkit-overflow-scrolling|transition: *all" styles.css` → 0.
- [A] `grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|\bwhite\b" styles.css` → 0 (Ausnahme per Kommentar `/* allow-color */`).
- [A] `grep -nE "^\.is-mobile|[ ,]\.is-mobile" styles.css` → 0 (nur `body.is-mobile`).
- [A] `wc -l styles.css` ≤ ~2300 (Erwartung nach −460 Zeilen; Abweichung begründen).
- [S] Smoke Desktop+Mobile ohne Rendering-Regressionen: Pixel-Diff (`pixelmatch`) Vorher/Nachher je Screen ≤ 1 % Abweichung **oder** Abweichung im PR begründet (z. B. bewusst geänderte Titel-Größe); Assertion (a) „Touch-Ziele ≥ 44 px“ grün.
- [M] Fenster auf Desktop auf 600 px verkleinert (Split-View): Modals nehmen **nicht** 100vw ein (CSS-02).
- [M] Light **und** Dark Theme + mindestens ein Fremd-Theme (z. B. Minimal): kein unlesbarer Text, Schatten sichtbar.

---

## Phase 3 – Texte, Icons, Sentence case _(~M)_

**Ziel:** Einheitliche, standardkonforme UI-Texte; zentraler Textspeicher (Vorbereitung i18n).

| Task | Inhalt                                                                                                                                                      | Finding                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 3.1  | `src/i18n/strings.ts` (en) mit Schlüsseln; alle UI-Literale (Settings, Modals, Commands, Notices) dorthin; Fallback-Texte vereinheitlichen („Unnamed rule“) | UI-30, UI-09 (Texte)    |
| 3.2  | Sentence case in allen Texten; ESLint-Ausnahme für `UpdateModal` entfernen; Doppelpunkte/„+“ aus Überschriften/Buttons („Conditions“, „Add rule“)           | UI-10, UI-11, VIS-03/05 |
| 3.3  | Emojis → `setIcon` (Lucide) in Titeln/Listen (History, Preview, Update)                                                                                     | UI-12, VIS-02/07        |
| 3.4  | Modal-Titel über natives `setTitle`/`titleEl` statt `h2`/H1; History-Modal bekommt Titel „Move history“                                                     | UI-41, VIS-02           |
| 3.5  | „Cancel“ im reinen Info-Modal → „Close“; Konflikt-Aktion „Rename“ eindeutig („Keep both (rename)“)                                                          | VIS-07, UI-37           |

**Gate Phase 3**

- [A] Test `strings.test.ts`: alle Werte in `strings.ts` erfüllen Sentence-case-Heuristik (erstes Wort groß, Rest klein außer Eigennamen/Platzhalter/Akronyme aus Allowlist).
- [A] `grep -rnE "setName\(['\"][A-Z][a-z]+ [A-Z]" src` → 0 (Title Case in Namen).
- [A] `grep -rnE "[\x{1F300}-\x{1FAFF}]" -P src` → 0 (keine Emojis im Code, außer Tests/Docs).
- [A] `grep -n "sentence-case" eslint.config.mjs` → keine `off`-Regel.
- [A] Lint mit neuer `eslint-plugin-obsidianmd`-Version ohne Treffer.
- [S] Assertion (e): jedes Modal hat nativen Titel; Screenshot-Review der 8 Modals Desktop+Mobile.
- [M] Textdurchgang: keine gemischte Groß-/Kleinschreibung, kein „1 files“, keine Plugin-Namen in Command-Namen.

---

## Phase 4 – Settings-Tab: nativer Aufbau _(~L)_

**Ziel:** Settings sehen auf Desktop **und** Mobile wie Obsidian aus; ein System statt zwei.

| Task | Inhalt                                                                                                                                                                                                                               | Finding              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| 4.1  | **Entscheidung** (ADR in `docs/analysis/adr-settings.md`): deklarativ (`settingDefinitions.ts`) als Single Source; `sections/` rendern daraus. Prüfen, ob `SettingGroup` bei `minAppVersion` 1.8.7 verfügbar ist, sonst `setHeading` | UI-09, UI-38         |
| 4.2  | Duplikat-Pfad entfernen, Texte nur noch aus `strings.ts`; Tests für Definition→Render (jsdom)                                                                                                                                        | UI-09                |
| 4.3  | `advancedNoteMover-mobile-optimized` für Toggles/Dropdowns entfernen (nur breite Controls dürfen stapeln); toten Mobile-V1-Code löschen                                                                                              | VIS-01, UI-25, UI-28 |
| 4.4  | Hinweise (Filter, Rules, Conflict-Warnung) als einheitliches Pattern; „Add rule/filter“ als `Setting`+`addButton` mit Icon; Beschreibungen auf ≤ 1–2 Zeilen kürzen, Details hinter Info-Link/Doku                                    | VIS-04               |
| 4.5  | Button-Semantik: `setCta()` höchstens ein Mal je Sektion, `setWarning()` nur Löschen; Import → Bestätigungsdialog statt rot                                                                                                          | VIS-05               |
| 4.6  | Regelzeile: Untertitel „Bedingung → Ziel“, Overflow-Menü (Edit, Duplicate, Move up/down, Delete), Handle-Kontrast                                                                                                                    | VIS-06               |
| 4.7  | DOM-Umhängen/Entfernen von Setting-Teilen ersetzen durch Render-Optionen; Settings-Tab-Datei/Klassenname angleichen, nur eine Instanziierung                                                                                         | UI-39, UI-38         |

**Gate Phase 4**

- [A] Test: jede Definition in `settingDefinitions.ts` wird in genau einer Section gerendert (keine Doppelung/Lücke).
- [A] `grep -rn "mobile-optimized" src styles.css` → 0; `grep -rnE "createEl\(['\"]h[1-6]" src/settings` → 0.
- [S] Mobile-Assertion „Toggle-Setting: Control rechts neben Name“ (`control.getBoundingClientRect().left > name.getBoundingClientRect().right − Toleranz`) für alle `mod-toggle`-Settings grün; Höhe einer Toggle-Karte ≤ 96 px.
- [S] Assertion „max. 1 `.mod-cta` je Sektion“, „kein `.mod-warning` außer Clear history/Delete“.
- [M] Screenshot-Vergleich neben nativem Obsidian-Tab (z. B. „Dateien & Links“) Desktop+Mobile: gleiche Abstände, Heading-Stil, Toggle-Position.
- [M] Reorder-Alternative aus Phase 7 noch nicht nötig; Drag&Drop funktioniert weiter (Regression).

---

## Phase 5 – Regel-Editor vereinheitlichen & Performance _(~L)_

**Ziel:** Ein Editor, Desktop = Mobile in Struktur; kein Fokusverlust; Live-Feedback.

| Task | Inhalt                                                                                                                                                                                                    | Finding             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 5.1  | Gemeinsame Komponenten (`RuleNameField`, `AggregationControl`, `ConditionRow`, `DestinationField`) in `src/modals/rule-editor/components/`; Desktop-Editor nutzt sie, Mobile-Editor bleibt Layout-Vorlage | UI-22, VIS-03       |
| 5.2  | Rendering inkrementell: Eingabe aktualisiert nur die betroffene Zeile; Fokus/Caret bleiben                                                                                                                | UI-05               |
| 5.3  | Aggregation als `role="radiogroup"`/`aria-checked`, Erklärtext je Option; Labels für Felder; Icon-Buttons mit `aria-label`                                                                                | UI-04, UI-23, UI-24 |
| 5.4  | Destination-Hilfe einklappen (`<details>`/Toggle) + „Template examples“ wie Mobile; Platzhalter-Chips                                                                                                     | VIS-03              |
| 5.5  | `RuleEditorModal` aufteilen (State/Validierung/Render), Drag-Umsortieren der Bedingungen ohne DOM-Eingriff (State ändern, neu rendern)                                                                    | UI-21               |
| 5.6  | Property-Extraktion (3–4×) zu einem Util mit Tests zusammenführen                                                                                                                                         | UI-29               |
| 5.7  | **Live-Vorschau** im Editor: „Diese Regel trifft aktuell N Notizen“ (debounced, abbrechbar, nutzt `RuleMatcherV2` + Caches)                                                                               | P1                  |

**Gate Phase 5**

- [A] `ruleEditorState.test.ts`: Hinzufügen/Entfernen/Umsortieren/Validieren von Bedingungen; Undo bei Cancel.
- [A] `propertyExtraction.test.ts`: Tabelle aus Frontmatter-Fällen (Liste, String, Zahl, Datum, leer, verschachtelt).
- [A] `ruleLivePreview.test.ts`: Treffer-Zähler korrekt auf Fixture-Vault; Abbruch bei erneuter Eingabe.
- [A] jsdom-Test: Tippen von 10 Zeichen im Wertfeld ⇒ `document.activeElement` bleibt dasselbe Element; `renderTriggers` wird nicht 10× komplett aufgerufen (Spy).
- [S] Assertion (b) „Icon-Buttons mit aria-label“ im Rule-Editor Desktop+Mobile grün.
- [M] Desktop-Editor-Screenshot erfüllt Checkliste: sentence case, keine Doppel-Trennlinien, Hilfetext einklappbar, Active-Label vorhanden, Footer sichtbar.

---

## Phase 6 – History, Preview, Conflict-Modals _(~L)_

**Ziel:** Lesbare, bedienbare Listen-Modals auf beiden Plattformen.

| Task | Inhalt                                                                                                                                                                                                                                 | Finding       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 6.1  | History: Titel, Gruppierung nach Tag, Meta-Zeile (Zeit, Regel), Aktionen als Icon-Buttons mit Tooltip (Desktop) / Overflow-Menü (Mobile); „Add to blacklist“ neutral; Doppel-Linien weg; Open/Undo-Logik aus 4 Kopien in eine Funktion | VIS-02, UI-20 |
| 6.2  | Preview: Leerzustand mit Erklärung + Link zu Regeln; Spalte „Regel/Grund“ je Datei (angewandt, Blacklist, Konflikt, kein Treffer); Teilauswahl (Checkbox je Datei)                                                                     | VIS-07, P3    |
| 6.3  | Bulk-Preview abbrechbar (AbortController, stoppt bei `onClose`); Fortschritt                                                                                                                                                           | UI-15         |
| 6.4  | UpdateModal: ein Renderer für Changelog-Blöcke (6 Duplikate → 1), typisierter Cast entfernen, Lebenszyklus                                                                                                                             | UI-18, UI-19  |
| 6.5  | ConfirmModal: redundante Mobile/Desktop-Zweige vereinheitlichen                                                                                                                                                                        | UI-40         |
| 6.6  | Statusmeldungen in `aria-live="polite"`-Region                                                                                                                                                                                         | UI-36         |

**Gate Phase 6**

- [A] `historyGrouping.test.ts` (Gruppierung/Sortierung/Zeitformat), `previewReasons.test.ts` (jeder Skip-Grund aus `FileMoveSkipReason` hat Text), `abortPreview.test.ts` (Abbruch ⇒ keine weiteren Datei-Reads, Spy).
- [A] `changelogRender.test.ts`: Snapshot für alle Blocktypen.
- [S] Mobile-Assertions (a) und (f) für History/Preview/Conflict grün; keine Vollbreite-Button-Stapel mit >3 Buttons je Eintrag.
- [M] Screenshots Desktop+Mobile der drei Modals im Leer- und im Gefüllt-Zustand; Review gegen VIS-02/07.

---

## Phase 7 – Accessibility & Touch _(~M)_

**Ziel:** Alles per Tastatur und Touch bedienbar.

| Task | Inhalt                                                                                                                                                                     | Finding      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 7.1  | Reorder ohne DnD: „Move up/down“ (Menü-Eintrag + Tastatur Alt+↑/↓ am fokussierten Handle); DnD bleibt zusätzlich; Handle bekommt Tastenhandler oder verliert `role=button` | UI-02, UI-03 |
| 7.2  | DragDropManager: `event.target`-Prüfung, nicht O(n) pro `dragover` (Cache der Rects)                                                                                       | UI-42        |
| 7.3  | Fokus-Management: Modal fokussiert erstes Feld, Esc schließt, Fokus kehrt zurück; sichtbares `:focus-visible`                                                              | A11y         |
| 7.4  | Kontrast: Handles/Pfade auf `--text-muted`; Prüfskript für Kontrast ≥ 4.5:1 (Text) / 3:1 (Icons) in Dark+Light                                                             | CSS-20       |

**Gate Phase 7**

- [A] `reorder.test.ts`: Move up/down ändert Reihenfolge und persistiert; erste/letzte Zeile deaktivieren Up/Down.
- [A] jsdom-Test: Handle reagiert auf Alt+ArrowUp/Down.
- [S] Tab-Walk-Test im Smoke: Tab durch jeden Screen erreicht alle interaktiven Elemente, kein Fokus-Trap, Esc schließt Modals.
- [S] Axe-core-Lauf (`axe-core` in der Test-Seite injiziert) auf allen Screens: 0 „serious/critical“.
- [M] VoiceOver (macOS) und TalkBack/VoiceOver (Gerät) Kurztest: Regel anlegen, verschieben, undo – Controls werden sinnvoll vorgelesen.

---

## Phase 8 – Sicherheitsnetze (Datenrisiko) _(~M)_

| Task | Inhalt                                                                                                                                                       | Finding     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 8.1  | „Move all files in vault“ nur nach Preview + Bestätigung (Anzahl, erste 10 Pfade, Undo-Hinweis)                                                              | UI-16, F6   |
| 8.2  | Import-Settings: Diff-/Zusammenfassungsdialog (n Regeln, n Filter überschrieben) + Bestätigung; automatisches Backup der alten Settings (`data.backup.json`) | VIS-05, P12 |
| 8.3  | „Why not moved?“-Regeltester (Notiz wählen → je Regel Treffer/Bedingung)                                                                                     | P2          |

**Gate Phase 8**

- [A] `bulkMoveGuard.test.ts`: ohne Bestätigung wird `renameFile` nie aufgerufen (Spy); mit Bestätigung exakt die Preview-Dateien.
- [A] `importBackup.test.ts`: Backup entsteht vor Überschreiben; Rollback möglich.
- [A] `ruleTester.test.ts`: Tabelle mit Beispiel-Notizen → erwartete Treffer/Gründe.
- [M] Szenario: Vault mit 50 Notizen, Bulk-Move → Undo stellt alle Pfade und Links wieder her (Vorher/Nachher-Vergleich).

---

## Phase 9 – Lokalisierung _(~M–L, optional)_

| Task | Inhalt                                                                                                  | Finding |
| ---- | ------------------------------------------------------------------------------------------------------- | ------- |
| 9.1  | `t(key, params)` über `strings.ts`; Sprache via Obsidian-Locale, Fallback en; Plural-Regeln pro Sprache | VIS-08  |
| 9.2  | `de.ts` komplett; Test: alle Schlüssel in allen Sprachen vorhanden                                      | VIS-08  |

**Gate Phase 9**

- [A] `i18n.test.ts`: Schlüssel-Parität en↔de; Platzhalter identisch; Fallback bei fehlendem Key.
- [S] Smoke mit `de` startet ohne englische Literale in Settings/Modals (DOM-Textvergleich gegen `en`-Werte → 0 Treffer außer Eigennamen).

---

## Phase 10 – Release & Abschluss-Regression _(~S–M)_

| Task | Inhalt                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------ |
| 10.1 | `docs/analysis/05-closure.md`: jedes Finding → Status (behoben/PR/won't fix + Begründung)                    |
| 10.2 | Gesamter Smoke Desktop+Mobile, Light+Dark, ≥ 1 Fremd-Theme; Pixel-Vergleich zu Phase-0-Baseline dokumentiert |
| 10.3 | Echtgerät-Test iOS + Android (Settings, Rule-Editor, History, Preview, Verschieben, Undo)                    |
| 10.4 | CHANGELOG, Version via `npm version`, Release-Assets (`main.js`, `manifest.json`, `styles.css`)              |

**Gate Phase 10 (Release-Gate)**

- [A] Gesamt-Suite grün; `baseline-smoke.json` zeigt **0 offene Assertions** (außer dokumentierter Ausnahmen).
- [A] `grep`-Gates aus Phasen 1–3 laufen als Test `src/__guards__/conventions.test.ts` (verhindert Rückfall).
- [A] Bundle-Größe `main.js` ≤ Baseline + 5 % (wegen i18n/Komponenten), `styles.css` kleiner als Baseline.
- [M] Closure-Dokument vollständig, jede Zeile verlinkt PR/Commit.
- [M] Mobile-Echtgerät-Checkliste abgehakt.

---

## Traceability – Findings → Phase

| Finding       | Phase             | Finding           | Phase                 |
| ------------- | ----------------- | ----------------- | --------------------- |
| VIS-01        | 4                 | UI-21             | 5                     |
| VIS-02        | 3, 6              | UI-22             | 5                     |
| VIS-03        | 3, 5              | UI-23             | 5                     |
| VIS-04        | 4                 | UI-24             | 5                     |
| VIS-05        | 3, 4, 8           | UI-25             | 0.4/4 (knip, Löschen) |
| VIS-06        | 4, 7              | UI-26             | 1                     |
| VIS-07        | 3, 6              | UI-27             | 1                     |
| VIS-08        | 9                 | UI-28             | 4                     |
| CSS-01…20     | 2 (siehe Tabelle) | UI-29             | 5                     |
| UI-01         | 1                 | UI-30             | 3                     |
| UI-02, 03     | 7                 | UI-31             | 1                     |
| UI-04, 05     | 5                 | UI-32, 33, 34, 35 | 1                     |
| UI-06         | 1                 | UI-36             | 6                     |
| UI-07, 43     | 1                 | UI-37             | 3                     |
| UI-08         | 1                 | UI-38, 39         | 4                     |
| UI-09         | 3, 4              | UI-40             | 6                     |
| UI-10, 11, 12 | 3                 | UI-41             | 3                     |
| UI-13, 14     | 1                 | UI-42             | 7                     |
| UI-15         | 6                 | UI-16             | 8                     |
| UI-17         | 1                 | UI-18, 19, 20     | 6                     |

Nicht-Finding-Vorschläge aus `03-improvement-proposals.md` (P4–P11, P13–P16, Feature-Ideen) sind bewusst **nicht** Teil dieser Roadmap, da sie keine Probleme beheben; Übernahme nach Phase 10 als eigenes Backlog.

## Empfohlene PR-Aufteilung

Phase 0 → 1 PR · Phase 1 → 3 PRs (Import/Modals/Lifecycle, Utils, Logging) · Phase 2 → 3 PRs (Dead CSS, Mobile-Selektoren, Tokens) · Phase 3 → 2 PRs · Phase 4 → 3 PRs · Phase 5 → 3 PRs · Phase 6 → 3 PRs · Phase 7 → 2 PRs · Phase 8 → 2 PRs · Phase 9 → 1 PR · Phase 10 → 1 PR.
