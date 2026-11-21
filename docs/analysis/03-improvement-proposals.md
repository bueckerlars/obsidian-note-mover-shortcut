# Verbesserungsvorschläge – Advanced Note Mover

Aufbauend auf `02-findings.md`. Vorschläge sind **Ideen zur Priorisierung**, nichts davon ist umgesetzt. Aufwand: S <1h · M <1 Tag · L mehrere Tage. IDs (VIS-/UI-/CSS-) verweisen auf die Findings.

## 0. Empfohlene Reihenfolge

1. **Release 1.3.2 „Polish & Fixes“** (Quick Wins, kein Risiko): Abschnitt 1 + Abschnitt 2.A.
2. **Release 1.4 „Native look“**: Settings/Modals an Obsidian-Standard angleichen (Abschnitt 2.B), A11y, Mobile.
3. **Release 1.5 „Safer & smarter moves“**: Sicherheitsnetze und neue Features (Abschnitt 3).
4. **Parallel/laufend**: Tooling, Tests, i18n (Abschnitt 4).

---

## 1. Fixes (Bugs/Robustheit)

| #   | Vorschlag                                                                                                                                                     | Finding      | Aufwand |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------- |
| F1  | Import-Dialog: Abbruch behandeln (`cancel`-Event / Fokus-Fallback), Button wieder aktivieren                                                                  | UI-01        | S       |
| F2  | ConflictSkipCacheModal: Titel in `refreshContent` neu erzeugen (oder Titel außerhalb von `contentEl`)                                                         | UI-06        | S       |
| F3  | Suggest-Instanzen (`PropertySuggest` u. a.) beim Neurendern/`onClose` `destroy()`en; Listener über `plugin.registerEvent`                                     | UI-07, UI-43 | S–M     |
| F4  | `BaseModal`: Größen über CSS-Klassen/`setCssProps` statt `style.setProperty(…,'important')`                                                                   | UI-08        | S       |
| F5  | Editor-Rerender: nur geänderte Zeile aktualisieren, Fokus/Caret erhalten (kein `renderTriggers()` bei jedem Tastendruck)                                      | UI-05        | M       |
| F6  | „Move all files in vault“ nur mit Preview + Bestätigungsdialog (Anzahl, erste N Pfade, Undo-Hinweis)                                                          | UI-16        | M       |
| F7  | Bulk-Preview abbrechbar (AbortController) und stoppt beim Schließen des Modals                                                                                | UI-15        | M       |
| F8  | Intervall-Eingabe debouncen/validieren (min/max, `Number.isInteger`), Timer nicht pro Tastendruck neu starten                                                 | UI-27        | S       |
| F9  | Plural-Helper (`1 file`/`2 files`) zentral                                                                                                                    | UI-17        | S       |
| F10 | Fehler sichtbar machen: statt „Check console“ eine konkrete Meldung + „Copy details“-Button; Notice-Bündelung bei Bulk (eine Zusammenfassung statt N Notices) | UI-13, UI-14 | M       |
| F11 | `window.*` → `activeWindow`/`activeDocument` (Pop-out-Fenster), `console.*` hinter Debug-Setting                                                              | UI-33/34     | S       |

## 2. Styling & UX („an aktuellen Obsidian-Standard anpassen“)

### 2.A Quick Wins (S)

- **Sentence case überall** (inkl. Buttons, Modal-Titel, Commands); ESLint-Ausnahme für `UpdateModal` entfernen (UI-10/11). Danach `eslint-plugin-obsidianmd` auf ≥ 0.4 heben und neue Regeln abarbeiten.
- **Emojis → `setIcon`** (Lucide: `file-text`, `package`, `search`, `undo-2`, `ban`) (UI-12, VIS-02/07).
- **Mobile-Spalten-Hack entfernen** (`advancedNoteMover-mobile-optimized` für Toggles/Dropdowns) → VIS-01.
- **Button-Semantik**: genau ein `cta` je Sektion; `warning` nur für Löschen; „Add to blacklist“ und „Import“ nicht rot (VIS-05).
- **CSS aufräumen**: toten CSS löschen (~460 Zeilen), `[class*='noteMover']` ersetzen, `.is-mobile`→`body.is-mobile`, `transition: all`, `-webkit-overflow-scrolling`, `100vh`→`dvh`, Shadow/Variablen-Fixes (CSS-01/03/05/06/07/10/15/16/17).
- Leerzustand im Preview-Modal erklären, „Cancel“→„Close“ (VIS-07).

### 2.B Strukturelle Angleichung (M–L)

- **Settings nativ aufbauen**: Überschriften per `Setting.setHeading()`, Hinweise per `setDesc`, „Add rule/filter“ als `Setting` mit rechtsbündigem Button; keine eigenen Karten/Container-Chrome. Prüfen, ob `SettingGroup` (neuere API) bei der gewünschten `minAppVersion` zur Verfügung steht – sonst Fallback auf `setHeading` (VIS-04).
- **Ein Settings-System**: `sections/` **oder** `settingDefinitions.ts` – nicht beide (UI-09). Empfehlung: deklarative Definitionen behalten, `sections/` darüber rendern lassen (oder umgekehrt), Texte nur einmal.
- **Ein Regel-Editor** mit gemeinsamen Komponenten für Desktop/Mobile; Struktur des Mobile-Editors (Karten, Erklärtexte, sticky Footer) als Vorlage (VIS-03, UI-22). Hilfetext zu Templates als einklappbares Beispiel-Panel + Autocomplete-Hinweis.
- **Native Modal-Titel** (`setTitle`) statt eigener `h2`/H1 (UI-41); einheitliche Modal-Größen über Klassen.
- **Spacing/Typo auf Tokens**: `--size-4-*`, `--radius-s/m/l`, `--font-ui-*`; Mobile-Block zuerst (CSS-12/13/14).
- **Konsistentes Prefix** `advancedNoteMover-` (Migrationshinweis im Changelog; CSS-08).
- **Regelzeile informativer**: Untertitel „tag includes #x → Archive/{{year}}“, Overflow-Menü (Edit, Duplicate, Move up/down, Delete), Aktiv-Toggle bleibt sichtbar (VIS-06).
- **History-Modal neu**: Titel, Gruppierung nach Tag, Suchfeld/Filter (Datei, Regel), Aktionen als Icon-Buttons mit Tooltip bzw. Menü auf Mobile (VIS-02).

### 2.C Accessibility & Mobile (M)

- Alle Icon-Buttons `aria-label`; Inputs mit `<label for>` bzw. `Setting`-Name; Aggregations-Umschalter als `role="radiogroup"` mit `aria-checked` (UI-04/23/24).
- **Reorder ohne Drag&Drop**: „Move up/down“-Aktionen + Tastatur (Alt+↑/↓) ; DnD nur zusätzlich (UI-02/03).
- Status-/Fehlertexte in `aria-live`-Region (UI-36).
- Touch-Ziele ≥ 44 px prüfen (CSS-05), Phone-Layout für History/Preview-Zeilen ohne Vollbreiten-Button-Stapel.
- Echtgerät-Test iOS/Android (bisher nur Emulation).

---

## 3. Features

### 3.A Hoher Nutzen, überschaubarer Aufwand

| #   | Feature                                                                                                                            | Nutzen                          | Aufwand |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------- |
| P1  | **Dry-run-Report beim Speichern einer Regel**: „Diese Regel würde 12 Notizen verschieben“ (Live-Vorschau im Editor, mit Pfadliste) | Fehlkonfiguration früh erkennen | M       |
| P2  | **Regel-Tester**: Notiz auswählen → zeigt, welche Regel(n) greifen, welche Bedingung scheitert und warum („Why not moved?“)        | Debugging, weniger Support      | M       |
| P3  | **Erklärung im Preview**: pro Datei „Regel X (Bedingung Y)“ oder „übersprungen: Blacklist / Konflikt / kein Treffer“               | Transparenz                     | S–M     |
| P4  | **Befehl „Move current note to rule destination…“ mit Regelwahl** (Suggest-Modal)                                                  | manueller Override              | S       |
| P5  | **Regeln gruppieren/ordnen mit Suche und Filter** (bei >20 Regeln), „Duplicate“ & „Disable all“                                    | Skalierung                      | M       |
| P6  | **Ordner-/Pfad-Picker** statt Freitext für Ziel (mit Template-Platzhalter-Chips)                                                   | weniger Tippfehler              | M       |
| P7  | **Status-Bar-Item / Ribbon-Menü** mit „Letzter Lauf: n verschoben“, Pause/Resume der Automatik                                     | Kontrolle                       | S       |
| P8  | **„Pause automation“-Command + Per-Note-Opt-out per Frontmatter** (`note-mover: skip`)                                             | Ausnahmen ohne Blacklist        | S       |

### 3.B Mittelfristig

| #   | Feature                                                                                                                                           | Nutzen              | Aufwand |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------- |
| P9  | **Undo-Gruppen robuster**: Undo für ganze Läufe mit Konflikt-/Link-Status, „Redo“, Undo-Limit pro Zeit                                            | Vertrauen           | M       |
| P10 | **Regel-Vorlagen/Presets** („PARA“, „Zettelkasten“, „Datum-Archiv“, „Projekt-Tags“) beim ersten Start und als Import-Galerie                      | Onboarding          | M       |
| P11 | **Onboarding-Flow** beim ersten Start (Leerzustand der Regeln mit „Create your first rule“ + Beispiel)                                            | Einstieg            | S–M     |
| P12 | **Settings-Export pro Bereich** (nur Regeln / nur Filter), Import mit Diff-Vorschau und Merge statt Überschreiben                                 | sicheres Teilen     | M       |
| P13 | **Bedingungen erweitern**: Backlink-/Link-Anzahl, Ordnerinhalt, Wortanzahl, „enthält Aufgaben“, Regex-Tester im Editor                            | mehr Regeln möglich | M–L     |
| P14 | **Aktionen jenseits Move**: Tag setzen, Property schreiben, umbenennen (Template), Alias – „Move“ als eine Aktion von mehreren                    | Differenzierung     | L       |
| P15 | **Konflikt-Strategien erweitern**: „Rename with suffix“ eindeutig benennen (UI-37), „Merge“-Hinweis, Konfliktprotokoll mit Aktionen (Resolve now) | weniger Frust       | M       |
| P16 | **Verlauf als Datei/Note exportieren** (Markdown-Log optional im Vault)                                                                           | Nachvollziehbarkeit | S–M     |

### 3.C Langfristig / Optional

- **Lokalisierung** (de zuerst; Obsidian-Sprache folgen) mit zentralem `t()`-Modul – löst VIS-08/UI-30; Community-Übersetzungen via JSON.
- **Command-API / Events** für andere Plugins (`app.plugins.plugins['note-mover-shortcut'].api.moveNote(...)`) und **URI-Handler** (`obsidian://note-mover?...`).
- **Vorschau als eigener View/Leaf** statt Modal (große Läufe, Filter, Sortierung, Teilauswahl „nur diese verschieben“).
- **Teilauswahl im Bulk-Preview** (Checkboxen pro Datei) – direkt nützlich, ohne neue Architektur (S–M).

---

## 4. Technik, Qualität, Wartbarkeit

| #   | Vorschlag                                                                                                                                                                                                     | Finding        | Aufwand |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------- |
| T1  | **AGENTS.md pflegen** (liegt bereits im Root) und in CONTRIBUTING verlinken; CONTRIBUTING-Node-Version (16) aktualisieren (veraltet)                                                                          | –              | S       |
| T2  | `eslint-plugin-obsidianmd` 0.3 → ≥ 0.4 (Template) bzw. aktuell; Regeln für Sentence case nicht per Ausnahme umgehen                                                                                           | UI-11          | S       |
| T3  | **UI-Smoke-Test-Skript** (CDP, siehe `docs/analysis/tools/cdp.mjs`): öffnet jeden Screen Desktop+Mobile, speichert Screenshots, prüft z. B. „keine Buttons <44 px“, „keine leeren aria-label“. In CI optional | alle visuellen | M       |
| T4  | **Große Dateien splitten** (`UpdateModal`, `HistoryModal`, `RuleEditorModal`, `settingDefinitions.ts`) und Duplikate (Property-Extraktion 3–4×) zusammenführen                                                | UI-18…22, 29   | L       |
| T5  | **Toter Code/Konstanten entfernen** (TS + CSS) mit `knip`/`ts-prune` im CI                                                                                                                                    | UI-25, CSS-01  | S–M     |
| T6  | **Tests für UI-Logik** extrahieren (Plural, Texte, Regel-Zusammenfassung, Import-Validierung); Vitest-Abdeckung für `core/` beibehalten                                                                       | –              | M       |
| T7  | **Debug-Version** aus Code entfernen/aus `manifest` lesen; Release-Notes erneut öffnen (Command „Show release notes“)                                                                                         | UI-26          | S       |
| T8  | **Trace-Export** über Obsidian-Dateiauswahl/`Blob`-Download statt `vault.adapter.write` ins Vault                                                                                                             | UI-35          | S       |
| T9  | Daten-Schema-Migrationen dokumentieren/testen (V1→V2-Regeln) vor größeren Settings-Umbauten                                                                                                                   | –              | M       |

---

## 5. Vorschlag für Issues/PRs (Schnitt)

1. `fix: robustness quick fixes` – F1–F4, F8, F9, F11 (klein, testbar).
2. `style: sentence case, icons, button semantics` – 2.A ohne CSS-Cleanup.
3. `refactor(css): remove dead css, scope selectors, body.is-mobile` – CSS-01/03/05/06/07/10/15/16/17.
4. `feat(settings): native settings layout (desktop + mobile)` – VIS-01/04/05/06, UI-09.
5. `feat(editor): unified rule editor + live preview` – VIS-03, P1, P2, UI-05/22.
6. `feat(history): redesigned history modal` – VIS-02, P9.
7. `feat(safety): confirm + preview for vault-wide move; cancelable preview` – F6/F7.
8. `feat(i18n): de/en` – 3.C.
9. `chore(tooling): eslint-plugin-obsidianmd, UI smoke test` – T2/T3.
