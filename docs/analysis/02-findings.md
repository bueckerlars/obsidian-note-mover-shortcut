# Findings – Advanced Note Mover (v1.3.1, Stand 2026-11-21)

Quellen: Screenshots der laufenden Instanz (Obsidian 1.12.7, isolierte Vault-Kopie, Dark-Theme, Desktop 1400×1100 und Mobile-Emulation 390×844),
Code-Analyse (`raw/css-findings.md` 20 Findings, `raw/ui-code-findings.md` 43 Findings), Standards (`01-obsidian-standards-research.md`).
Details, Code-Belege und Fix-Vorschläge stehen in den Rohberichten; hier die konsolidierte Sicht.

**Legende:** Prio 🔴 hoch · 🟠 mittel · 🟡 niedrig. Aufwand S (<1h) · M (<1 Tag) · L (mehrere Tage).
**Nicht geprüft:** Light-Theme, Fremd-Themes, echtes Gerät (nur `emulateMobile`), Screenreader. Laufzeitbefunde aus dem UI-Report (UI-01, 05, 06, 07) sind aus dem Code abgeleitet, nicht im Browser reproduziert.

---

## A. Visuelle Findings (mit Screenshot)

Pfad der Bilder: `screenshots/`.

### VIS-01 🔴 Mobile-Settings: Toggle/Button rutschen unter den Text

- **Bild:** `mobile-settings-top.png`, `mobile-settings-sec2.png`, `mobile-settings-sec4.png` (vgl. `desktop-settings-top.png`)
- **Beobachtung:** Jede Einstellung mit Klasse `advancedNoteMover-mobile-optimized` wird zur Spalte (Name, Beschreibung, darunter Toggle/Control). Bei einem einzigen Toggle entsteht eine ~300 px hohe Karte mit viel Leerraum; Obsidians Standard (Toggle rechts neben dem Text, 1 Zeile) geht verloren. Andere Settings (Performance-Sektion) zeigen den Toggle korrekt rechts – das Layout ist **inkonsistent innerhalb desselben Tabs**.
- **Ursache:** `styles.css:1465` `.setting-item.advancedNoteMover-mobile-optimized { flex-direction: column; … }`; Klasse in 10 Stellen in `src/settings/sections/*` gesetzt.
- **Fix:** Klasse und Regel für Toggles/Dropdowns entfernen (native Mobile-Darstellung nutzen); Spaltenlayout nur für Settings mit breitem Control (Textfeld, Button-Gruppe). **S–M**

### VIS-02 🔴 History-Modal: kein Titel, Emojis, Grammatik, verschachtelte Linien

- **Bild:** `desktop-modal-show-history.png`, `mobile-modal-show-history.png`
- **Beobachtung:** Das Modal startet ohne Titel direkt mit „Show entries from:“. Titel enthalten Emoji (📄, 📦), „Bulk Move: 1 files“ (Plural), Datum-Format `8.10.2026, 19:25:45` im Titel statt eigenes Meta-Feld. Doppelte/überlappende Trennlinien über den Aktions-Buttons, Aktionen nur als Icons ohne Beschriftung (Desktop), „Hide files“ als Text-Dreieck. Auf Mobile: volle Breite Buttons „Open/Undo/Add to blacklist“ stapeln sich, **„Add to blacklist“ ist rot gefüllt** (Warn-Farbe für eine nicht-destruktive Aktion), Modal-Inhalt läuft bis an den Rand (kein Padding links/rechts).
- **Fix:** Titel „Move history“ via natives Modal-Title; `setIcon` statt Emoji; Plural-Helper; Aktionen als `clickable-icon` mit `aria-label`/Tooltip, auf Mobile kompaktes „⋯“-Menü; Rot nur für Destruktives. **M** (Codebezug UI-12, UI-17, UI-20, UI-41; CSS-04)

### VIS-03 🟠 Desktop-Rule-Editor: uneinheitlich und überladen (Mobile-Editor ist besser)

- **Bild:** `desktop-modal-rule-editor.png` vs. `mobile-modal-rule-editor.png`, `mobile-modal-rule-editor-bottom.png`
- **Beobachtung:** Desktop: Titel „Rule Editor“ (Title Case, übergroßes H1 statt Modal-Titel), „Conditions:“ mit Doppelpunkt, doppelte Trennlinien, ein ~4-zeiliger Hilfetext als Fließtext ohne Struktur direkt unter dem Zielfeld, kein „Active“-Label am Toggle, Aggregations-Buttons All/Any/None ohne Erklärung. Mobile: klar gegliederte Karten, Labels, Erklärung („Every condition must match.“), „Template examples“-Link, sticky Footer – deutlich näher am Obsidian-Standard.
- **Fix:** Desktop-Editor an Mobile-Struktur angleichen (gemeinsame Komponenten; UI-22), Hilfetext einklappen/„Template examples“ auslagern, Sentence case. **M–L**

### VIS-04 🟠 Settings-Tab: Info-Blöcke sehen aus wie Settings, Beschreibungen zu lang

- **Bild:** `desktop-settings-top.png`, `desktop-settings-sec2.png`
- **Beobachtung:** Erklärtexte („Blacklist filters: …“, „The Advanced Note Mover will move …“) stehen in einer eigenen Karte wie eine Einstellung ohne Control; der Leerzustand „No filters are configured…“ steht ungeboxt darunter, danach eine Karte, die nur einen Button enthält („Add new filter“, „+ add rule“) – drei verschiedene visuelle Behandlungen für Hinweistexte. Beschreibungen mit bis zu 3 Zeilen („Create missing destination folders“, „Enable vault index cache“) – Obsidian empfiehlt kurze, einzeilige Beschreibungen.
- **Fix:** Ein Hinweis-Pattern (`setDesc` an der Heading-Setting oder `.setting-item-description`-Absatz), Add-Buttons als `Setting` mit `addButton` rechts neben dem Namen („Rules“ → „Add rule“), Beschreibungen kürzen. **S–M**

### VIS-05 🟠 Uneinheitliche Button-Semantik und Beschriftung

- **Bild:** `desktop-settings-sec4.png`
- **Beobachtung:** „Clean up now“ und „Export Settings“ sind primär (lila), „Import Settings“ ist **rot** (Warn), „Clear history“ rot, „Re-evaluate vault…“ neutral. Import ist nicht destruktiv-irreversibel im Sinne von „Clear“ (überschreibt aber Einstellungen → Bestätigung wäre das richtige Mittel, nicht Farbe). Mehrere Primär-Buttons konkurrieren. Beschriftung gemischt: „Export Settings“ (Title Case), „+ add rule“ (klein, Plus-Zeichen im Text), „Add new filter“.
- **Fix:** `setCta()` nur für die eine Hauptaktion je Sektion, `setWarning()` nur für Löschen; Sentence case („Export settings“), Icons über `setIcon` statt „+“. **S**

### VIS-06 🟠 Regelliste: Aktions-Icons ohne Beschriftung, Drag-Handle fast unsichtbar

- **Bild:** `desktop-settings-sec2.png` (Zeile „New Rule“)
- **Beobachtung:** Vier Icon-Aktionen (Löschen, Duplizieren, Bearbeiten, Toggle) + Drag-Handle in `opacity .6` auf dunklem Hintergrund; Zeile ist kompakter/niedriger als umgebende Settings-Karten (andere Höhe/Padding), Regel zeigt weder Ziel noch Bedingungs-Zusammenfassung. Reorder nur per Drag&Drop (nicht Touch-/Tastatur-tauglich, UI-02/03).
- **Fix:** Regelzeile mit Untertitel „Bedingungen → Zielordner“; Aktionen im Overflow-Menü („⋯“: Edit, Duplicate, Move up/down, Delete); Handle mit `--text-muted`. **M**

### VIS-07 🟡 Preview-Modal im Leerzustand

- **Bild:** `desktop-modal-preview-bulk-movement.png`
- **Beobachtung:** Emoji-Lupe im Titel, „Move Preview“ (Title Case), „3 files analyzed • 0 will be moved“ ohne Erklärung _warum_ nichts verschoben wird (z. B. keine Regel passt/Blacklist), einziger Button „Cancel“ (sollte „Close“ heißen).
- **Fix:** Leerzustand mit Hilfetext + Link zu Regeln; „Close“. **S**

### VIS-08 🟡 Plugin ist ausschließlich englisch

- **Bild:** alle (Obsidian-UI deutsch, Plugin englisch; zusammen sichtbar z. B. `mobile-modal-preview-note-movement.png`)
- **Beobachtung:** Keine Lokalisierung; Texte als Literale verstreut (UI-30).
- **Fix:** Zentrales `t()`-Modul mit Obsidian-Sprache (`getLanguage()`), Start mit en/de. **L**

---

## B. Code-/Style-Findings (Index; Details in den Rohberichten)

### B1. CSS (`raw/css-findings.md`)

| ID        | Prio | Ort                      | Kurz                                                                                                                                                                                        | Aufwand |
| --------- | ---- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| CSS-01    | 🟠   | styles.css (~460 Zeilen) | Toter CSS (46 Klassen ohne TS-Treffer; ~16 % der Datei)                                                                                                                                     | M       |
| CSS-02    | 🔴   | 1652-2105                | Mobile über `@media`-Breite statt `body.is-mobile` → greift auf schmalen Desktop-Fenstern/Split-View                                                                                        | M       |
| CSS-03    | 🔴   | 1734, 1741, 2098         | `[class*='noteMover']` globale Selektoren                                                                                                                                                   | S       |
| CSS-04    | 🟠   | 1668-2493                | Titel-Größen in 4 konkurrierenden Blöcken                                                                                                                                                   | S       |
| CSS-05    | 🟠   | 2646                     | Segment-Buttons 40 px (<44 px Touch-Ziel)                                                                                                                                                   | S       |
| CSS-06    | 🟠   | 689                      | hartes `rgba`-Shadow → `var(--shadow-l)`                                                                                                                                                    | S       |
| CSS-07    | 🟠   | 1550                     | evtl. nicht existierende Variable `--background-modifier-active`                                                                                                                            | S       |
| CSS-08    | 🟠   | diverse                  | Mischprefix `note-mover-*` vs `advancedNoteMover-*` (Breaking für Custom-Snippets)                                                                                                          | M       |
| CSS-09…20 | 🟡   | –                        | Duplikate, `.is-mobile` ohne `body`, `16px`-Kommentare, px→`--size-*`/`--radius-*`/`--font-ui-*`, `transition: all`, `-webkit-overflow-scrolling`, `100vh`→`dvh`, `white`, Opacity-Kontrast | je S    |

Positiv: 0× `!important`, 0× Hex-Farben, keine globalen Überschreibungen von `.setting-item`/`.modal`, 266 `var()`-Nutzungen, `@container` für Modals.

### B2. UI-Code (`raw/ui-code-findings.md`)

| ID                         | Prio  | Kurz                                                                                                                                                                                                                                                                  | Aufwand |
| -------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| UI-01                      | 🔴    | Import-Dateidialog: bei Abbruch bleibt Promise pending, Button bleibt disabled (`ImportExportSettingsSection.ts:133-158`)                                                                                                                                             | S       |
| UI-02/03                   | 🔴    | Umsortieren nur per HTML5-DnD (Touch ✗, Tastatur ✗); Handle `role=button` ohne Tastenhandler                                                                                                                                                                          | M       |
| UI-04/05                   | 🔴    | Unbeschriftete Icon-Buttons/Felder im Desktop-Editor; `renderTriggers()` baut bei Eingabe alles neu → Fokusverlust                                                                                                                                                    | M       |
| UI-06                      | 🔴    | Titel der Conflict-Cache-Modal verschwindet nach Aktionen (`refreshContent` leert `contentEl`)                                                                                                                                                                        | S       |
| UI-07/43                   | 🔴    | `PropertySuggest`/Suggest-Instanzen nie `destroy()`ed → `metadataCache`-Listener-Leak pro Re-Render                                                                                                                                                                   | S–M     |
| UI-08                      | 🔴    | `BaseModal`: `style.setProperty(…,'important')` statt CSS-Klassen                                                                                                                                                                                                     | S       |
| UI-09                      | 🔴    | Zwei parallele Settings-UIs (`sections/` + `settingDefinitions.ts`, 766 Zeilen) mit abweichenden Texten                                                                                                                                                               | L       |
| UI-10/11                   | 🟠    | Title Case („Rule Editor“, „Move Preview“, „Clear History“, „Breaking Changes“); ESLint-Ausnahme sentence-case für `UpdateModal`                                                                                                                                      | S       |
| UI-12                      | 🟠    | Emojis als Icons                                                                                                                                                                                                                                                      | S       |
| UI-13/14                   | 🟠    | Stille Fehler, „Check console“-Hinweise; Notice-Flut bei Bulk/Eingabe                                                                                                                                                                                                 | M       |
| UI-15/16                   | 🟠    | Bulk-Preview nicht abbrechbar; „Move all files in vault“ ohne Preview/Bestätigung (Datenrisiko)                                                                                                                                                                       | M       |
| UI-17                      | 🟠    | Plural („1 files“)                                                                                                                                                                                                                                                    | S       |
| UI-18/19/20/21/22/28/29/40 | 🟠    | Duplikation/Verantwortlichkeiten: UpdateModal (6 Changelog-Blöcke), HistoryModal (4× Open/Undo), RuleEditorModal, 2 Editoren, `isMobile`-Boilerplate, Property-Extraktion 3–4×                                                                                        | L       |
| UI-23/24/36                | 🟠/🟡 | A11y: Aggregation-Umschalter ohne volle Semantik, Inputs ohne verknüpftes Label, Status nicht als Live-Region                                                                                                                                                         | M       |
| UI-25/26/27                | 🟠    | Toter Code, hartkodierte Debug-Version, `parseInt` + Timer-Neustart pro Tastendruck                                                                                                                                                                                   | S       |
| UI-30…42                   | 🟡    | Hartkodierte Texte, Klon-Logik, Plugin-Name in Notices, `console.*`, `window.*` statt `activeWindow`, Trace-Export via `vault.adapter.write`, „Rename“-Mehrdeutigkeit, Settings-Tab Doppelinstanziierung, DOM-Umhängen, Modal-Titel h2 vs nativ, DragDropManager O(n) | S–M     |

Lint-Hinweis: `eslint` (obsidianmd 0.3.0) meldet nichts – die Befunde liegen außerhalb der Regelabdeckung. Template nutzt inzwischen `eslint-plugin-obsidianmd ^0.4.0` (npm latest 0.6.0) → Upgrade bringt evtl. neue Treffer (siehe Vorschläge).

---

## C. Abgleich mit aktuellem Obsidian-Standard – Kurzbilanz

| Thema               | Stand im Plugin                                       | Standard                                                                                                                |
| ------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Farben/Tokens       | überwiegend Variablen, 0 Hex                          | ✅                                                                                                                      |
| Spacing/Radius/Font | px/em hartkodiert, nur Mobile-Editor nutzt `--size-*` | 🟠 `--size-4-*`, `--radius-*`, `--font-ui-*`                                                                            |
| Mobile-Selektor     | `@media` + `.is-mobile` gemischt                      | 🟠 `body.is-mobile` / `.is-phone`                                                                                       |
| Settings-Struktur   | Custom-Karten, Spalten-Hack, 2 Systeme                | 🔴 native `Setting`, `setHeading`, evtl. `SettingGroup` (neuere API – Verfügbarkeit gegen `minAppVersion` 1.8.7 prüfen) |
| UI-Text             | Title Case gemischt, Emojis                           | 🟠 Sentence case, Lucide-Icons                                                                                          |
| Inline-Styles       | `BaseModal` setzt Styles per JS                       | 🔴 CSS-Klassen/`setCssProps`                                                                                            |
| Cleanup             | Suggest-Leaks                                         | 🔴 `registerEvent`/`destroy`                                                                                            |
| A11y                | teilweise Labels, DnD ohne Tastatur                   | 🔴                                                                                                                      |
| Tooling             | eslint-plugin-obsidianmd 0.3.0                        | 🟡 ≥ 0.4 (Sample)                                                                                                       |
