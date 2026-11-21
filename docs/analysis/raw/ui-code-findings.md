# UI-Code-Befunde: Advanced Note Mover (TypeScript)

Stand: 2026-11-21, Plugin-Version 1.3.1 (`manifest.json`, `minAppVersion` 1.8.7)

## Scope und Methode

- Gelesen (vollstaendig): `main.ts`, `src/settings/Settings.ts`, `src/settings/sections/*.ts`, `src/settings/settingDefinitions.ts`, `src/settings/suggesters/*.ts` (AdvancedSuggest, TagSuggest, PropertySuggest, PropertyValueSuggest, FolderSuggest), `src/modals/*.ts` (inkl. `BaseModal`, `ConfirmModal`, `RuleEditorModal`, `ConflictModal`, `ConflictSkipCacheModal`, `HistoryModal`, `PreviewModal`, `UpdateModal`), `src/modals/rule-editor/*.ts`, `src/handlers/CommandHandler.ts`, `src/utils/{NoticeManager,DragDropManager,MobileUtils,Error,DebounceManager,single-file-move-notice,markdown-confirm}.ts`, `src/config/constants.ts`.
- Stichproben/Zaehlungen per grep: `innerHTML`, `style`, `h1-h6`, `console`, `any`, `window.`, `aria-`, `registerEvent`, `vault.adapter`, Verwendung einzelner Funktionen (dead-code-Pruefung).
- ESLint-Lauf: `npx eslint` mit `eslint-plugin-obsidianmd` 0.3.0 auf alle oben genannten UI-Dateien ergab keine Ausgabe (keine Befunde). Die Befunde unten sind daher ueberwiegend Dinge, die die aktuelle Lint-Konfiguration NICHT abdeckt. Zusaetzlich aktiv: `obsidianmd/ui/sentence-case` mit Ausnahme fuer `UpdateModal.ts` (siehe UI-11).
- Keine Datei ausser diesem Bericht wurde geaendert. Screenshots wurden nicht neu erstellt; laufzeitabhaengige Befunde sind als "im Browser pruefen" markiert.

## Zusammenfassung

- 43 Befunde: 9 hoch, 20 mittel, 14 niedrig.
- Die groessten Risiken fuer ein Community-Plugin-Review: Drag-and-Drop als einzige Umsortier-Moeglichkeit (auch auf Touch), `style.setProperty` in `BaseModal` (Richtlinie), Listener-Leak in `PropertySuggest`, Sentence-Case-Verstoesse (Title Case), und ein haengender Import-Dateidialog.
- Strukturell: Die Settings existieren zweimal (imperativ in `sections/` und deklarativ in `settingDefinitions.ts`) mit bereits abweichenden Texten. Der Rule-Editor existiert zweimal (Desktop-Modal und Mobile-View).
- Positiv: Settings-Ueberschriften mit `setHeading()`, keine `innerHTML`-Nutzung, kein `any`, Commands ohne Plugin-Name und ohne Default-Hotkeys, `registerEvent` fuer Vault-Events, Cleanup in `onunload`, Mobile-Rule-Editor mit Labels und `aria-labelledby`.

## Zeilenzahlen pro Datei (UI-Bereich)

| Datei                                                        | Zeilen | Verantwortlichkeit                                                                 |
| ------------------------------------------------------------ | -----: | ---------------------------------------------------------------------------------- |
| `src/settings/settingDefinitions.ts`                         |    766 | Deklarative Settings-Definition (zweite UI-Quelle, s. UI-09)                       |
| `src/settings/sections/RulesSettingsSection.ts`              |    383 | Regelliste, Re-Evaluate, Add-Button, Clone/Delete                                  |
| `src/settings/sections/ImportExportSettingsSection.ts`       |    371 | Export, Import, Validierung, Migration (zu viel fuer eine Sektion)                 |
| `src/settings/sections/FilterSettingsSection.ts`             |    222 | Filterliste, Suggest-Verwaltung, DnD                                               |
| `src/settings/sections/HistorySettingsSection.ts`            |    152 | Retention, Cleanup, Clear                                                          |
| `src/settings/sections/PeriodicMovementSettingsSection.ts`   |    151 | Datei heisst "PeriodicMovement", Klasse heisst `TriggerSettingsSection` (s. UI-38) |
| `src/settings/sections/PerformanceDebugSettingsSection.ts`   |    115 | Cache, Debug, Trace-Export                                                         |
| `src/settings/sections/ConflictResolutionSettingsSection.ts` |     91 | Konfliktstrategie + Warnung                                                        |
| `src/settings/sections/AttachmentsSettingsSection.ts`        |     90 | Attachments                                                                        |
| `src/settings/sections/UpdateSettingsSection.ts`             |     29 | Release-Notes-Toggle                                                               |
| `src/settings/Settings.ts`                                   |    278 | Tab-Orchestrierung, Doppel-Instanziierung (UI-38)                                  |
| `src/settings/suggesters/FolderSuggest.ts`                   |    471 | Ordner-/Template-Vorschlaege (Template-Parser)                                     |
| `src/settings/suggesters/AdvancedSuggest.ts`                 |    288 | Filter-Vorschlaege                                                                 |
| `src/settings/suggesters/PropertyValueSuggest.ts`            |    213 | Property-Werte                                                                     |
| `src/settings/suggesters/PropertySuggest.ts`                 |    195 | Property-Namen (Listener-Leak, UI-07)                                              |
| `src/settings/suggesters/TagSuggest.ts`                      |     44 | Tag-Vorschlaege                                                                    |
| `src/modals/RuleEditorModal.ts`                              |    557 | Desktop-Regeleditor: Layout, Trigger-Rendering, DnD, Footer, Discard-Logik (UI-21) |
| `src/modals/rule-editor/RuleEditorMobileView.ts`             |    529 | Mobile-Regeleditor (eigene UI, s. UI-22)                                           |
| `src/modals/rule-editor/ruleEditorShared.ts`                 |    234 | Gemeinsame Regel-Logik (Validierung, Trigger-Helfer)                               |
| `src/modals/HistoryModal.ts`                                 |    474 | Historie, 4-fach dupliziertes Open/Undo (UI-20)                                    |
| `src/modals/PreviewModal.ts`                                 |    338 | Vorschau UND Bulk-Ausfuehrung (Verantwortlichkeiten gemischt)                      |
| `src/modals/BaseModal.ts`                                    |    336 | Basisklasse, Inline-Styles (UI-08)                                                 |
| `src/modals/ConflictSkipCacheModal.ts`                       |    271 | Konflikt-Cache-Review (UI-06)                                                      |
| `src/modals/UpdateModal.ts`                                  |    253 | Changelog-Anzeige, 6 Kopierblöcke (UI-19)                                          |
| `src/modals/ConflictModal.ts`                                |    193 | Konflikt-Dialog                                                                    |
| `src/modals/ConfirmModal.ts`                                 |    138 | Bestaetigungsdialog                                                                |
| `src/utils/DragDropManager.ts`                               |    271 | Drag-and-Drop fuer alle Listen (UI-02, UI-03)                                      |
| `src/utils/MobileUtils.ts`                                   |    126 | Plattform-Erkennung + tote Button-Helfer (UI-25)                                   |
| `src/utils/NoticeManager.ts`                                 |    124 | Notices                                                                            |
| `src/handlers/CommandHandler.ts`                             |    156 | 8 Commands                                                                         |
| `main.ts`                                                    |    115 | Plugin-Lifecycle, Ribbon                                                           |

Summe Settings-Bereich ca. 2.660 Zeilen, Modal-Bereich ca. 3.440 Zeilen. Mehrere Dateien ueberschreiten die Groesse, ab der Verantwortlichkeiten meist auseinanderfallen (RuleEditorModal, HistoryModal, PreviewModal, ImportExportSettingsSection, settingDefinitions).

---

## Befunde: hoch

### UI-01: Import-Dateidialog kann Button dauerhaft blockieren

- **Schweregrad:** hoch (im Browser pruefen)
- **Datei:Zeile:** `src/settings/sections/ImportExportSettingsSection.ts:133-158`, Button-Zustand `:67-73`, toter Vergleich `:343`
- **Beschreibung:** `importSettings()` wartet auf ein `Promise`, das nur ueber `input.onchange` aufgeloest wird. Bricht der Nutzer den Dateidialog ab, feuert `change` in vielen Umgebungen nicht, das Promise bleibt pending. Dann bleibt der Import-Button disabled (das `finally` im Button-Handler laeuft nie), und das temporaere `<input>` bleibt im `document.body`. Der Vergleich `msg !== 'File selection cancelled'` ist unerreichbar, nichts wirft diesen Text.
- **Beleg:**
  ```ts
  const file = await new Promise<File>((resolve, reject) => {
    input.onchange = (e: Event) => { ... };
    input.click();
  });
  ```
- **Fix:** Auf das `cancel`-Event des Inputs hoeren (in Electron verfuegbar) bzw. Fokus-/Timeout-Fallback; Input in `finally` entfernen; Button-Zustand im Erfolgs- und Abbruchpfad zuruecksetzen; toten Vergleich entfernen.

### UI-02: Umsortieren nur per Drag-and-Drop, auf Touch nicht nutzbar

- **Schweregrad:** hoch
- **Datei:Zeile:** `src/utils/DragDropManager.ts:44-49` (HTML5-Drag-Events), `src/settings/sections/FilterSettingsSection.ts:129-141`, `src/settings/sections/RulesSettingsSection.ts:289-305`, `src/modals/RuleEditorModal.ts:407-449`
- **Beschreibung:** Filter, Regeln (Settings) und Trigger (Desktop-Regeleditor) werden ausschliesslich ueber `dragstart`/`drop` umsortiert. HTML5-Drag-and-Drop funktioniert auf Touch-Geraeten (Obsidian Mobile) nicht. Der Changelog benennt genau das als Grund fuer die Mobile-Ansicht des Regeleditors ("replacing drag and drop, which did not work with touch"). In den Settings-Listen fehlt dieser Ersatz jedoch. Es gibt keine Tastatur-Alternative (s. UI-03).
- **Beleg:** `RulesSettingsSection.ts:289-305` setzt `new DragDropManager(container, {...})` ohne `isMobile`-Verzweigung.
- **Fix:** Up/Down-Buttons (Muster aus `RuleEditorMobileView.renderConditionCard`, `ExtraButtonComponent` mit `arrow-up`/`arrow-down`) fuer Filter, Regeln und Trigger anbieten, mindestens auf Mobile. Gleichzeitig Tastatur-Reihenfolge ermoeglichen (siehe UI-03).

### UI-03: Drag-Handle ist `role="button"` und fokussierbar, reagiert aber nicht auf Tasten

- **Schweregrad:** hoch
- **Datei:Zeile:** `src/utils/DragDropManager.ts:235-246`
- **Beschreibung:** Der Handle wird mit `tabindex: '0'` und `role: 'button'` erzeugt, besitzt aber keinen `keydown`-Handler (im gesamten `src/` gibt es keinen `keydown`/`keyup`-Listener). Screenreader und Tastatur-Nutzer erhalten ein Bedienelement, das nichts tut. `title` und `aria-label` haben denselben Text.
- **Beleg:**
  ```ts
  attr: { draggable: 'true', 'aria-label': 'Drag to reorder', role: 'button', tabindex: '0', title: 'Drag to reorder' },
  ```
- **Fix:** Entweder Handle als reinen Dekor-Element ohne `role`/`tabindex` belassen und die Buttons aus UI-02 verwenden, oder Tastatur-Reordering implementieren (Alt+Pfeil hoch/runter, Enter aufnehmen). `title` entfernen, da `aria-label` vorhanden.

### UI-04: Trigger-Zeile im Desktop-Regeleditor: unbeschriftete Buttons und Felder

- **Schweregrad:** hoch
- **Datei:Zeile:** `src/modals/RuleEditorModal.ts:291-298` (Loeschen), `:301-303` (Kriterium-Select), `:319-322` (Operator-Select), `:326-331` (Property-Name, nur Placeholder), `:350-355` (Wert)
- **Beschreibung:** Der Loesch-Button enthaelt nur ein `x`-Icon ohne `aria-label` und ohne Tooltip. Selects und Inputs haben keine programmatische Beschriftung, Property-Name nur einen Placeholder. Die Mobile-Ansicht macht es richtig (`arrow-up`/`arrow-down`/`trash-2` mit `setTooltip`, `<label for>` je Feld).
- **Beleg:**
  ```ts
  const deleteBtn = row.createEl('button', { cls: 'advancedNoteMover-rule-trigger-delete-btn clickable-icon' });
  setIcon(deleteBtn, 'x');
  deleteBtn.onclick = () => { removeTrigger(...); this.renderTriggers(); };
  ```
- **Fix:** `setTooltip(deleteBtn, 'Delete condition')` (bzw. `aria-label`), `aria-label` an Selects und Inputs, und `<label>` bzw. `aria-labelledby` analog zur Mobile-View (`createField`).

### UI-05: Vollstaendiges Neurendern verliert Fokus und Eingabe

- **Schweregrad:** hoch (im Browser pruefen, besonders Property-Name-Eingabe)
- **Datei:Zeile:** `src/modals/RuleEditorModal.ts:335-345` (oninput), `:397-401` (Operator-Select), `:262-279` (`renderTriggers` leert den Container); `src/settings/sections/PerformanceDebugSettingsSection.ts:57, 74`, `PeriodicMovementSettingsSection.ts:38, 72`, `AttachmentsSettingsSection.ts:38`, `FilterSettingsSection.ts:39, 88, 120`, `RulesSettingsSection.ts:118`
- **Beschreibung:** Im Property-Name-Feld wird bei jedem Input, dessen Name einen bekannten Property-Typ trifft, `renderTriggers()` aufgerufen. Der komplette Container wird geleert und neu gebaut, das aktive Input wird zerstoert, der Fokus geht verloren. Gleiches gilt fuer jede Aenderung des Operator-Selects. In den Settings baut jeder Toggle den gesamten Tab neu auf (ueber `refreshDisplay`, debounced 150 ms). Das bricht Tastatur-Bedienung und kann den Scroll-Zustand zuruecksetzen.
- **Beleg:**
  ```ts
  propertyNameInput.oninput = () => {
    const detected = applyPropertyName(...);
    if (detected) { this.renderTriggers(); }
  };
  ```
- **Fix:** Nur die betroffene Zeile aktualisieren (Operator-Select neu befuellen statt Container neu bauen), Property-Name-Input unangetastet lassen. In den Settings Toggles direkt persistieren, nur bei strukturellen Aenderungen (Listen) neu rendern.

### UI-06: Titel der Konflikt-Cache-Modal verschwindet nach Aktionen

- **Schweregrad:** hoch (im Browser pruefen: Titel "Skipped move conflicts" vor/nach "Dismiss")
- **Datei:Zeile:** `src/modals/ConflictSkipCacheModal.ts:266-270`; Ursache: `src/modals/BaseModal.ts:231-259` (`createTitle` wird nur in `onOpen` aufgerufen, Zeile `:73`)
- **Beschreibung:** `refreshContent()` leert `contentEl` komplett und baut nur `createContent()` neu. Der Titel (Option `titleIcon`, kein `useNativeTitle`) liegt im `contentEl` und wird dabei entfernt. Betroffen: Dismiss (`:202`), Remove stale (`:246`), Clear all (`:263`). Die Modal behaelt danach keinen Titel. Der Fehler ist im Code eindeutig nachvollziehbar.
- **Fix:** Titel in `refreshContent` erhalten, z. B. `createTitle()` nach dem Leeren aufrufen, oder den Inhalt in einen eigenen Container `contentBodyEl` auslagern und nur diesen neu rendern (gleiches Muster wie `HistoryModal`).

### UI-07: Listener-Leak durch nicht zerstoerte `PropertySuggest`-Instanzen

- **Schweregrad:** hoch
- **Datei:Zeile:** `src/settings/suggesters/PropertySuggest.ts:43` (Registrierung), `:69-75` (`destroy`); Erzeugung ohne Speicherung in `src/modals/RuleEditorModal.ts:333` und `src/modals/rule-editor/RuleEditorMobileView.ts:480`
- **Beschreibung:** Der Konstruktor registriert `app.metadataCache.on('changed', ...)`. `destroy()` wird im gesamten Code nirgends aufgerufen. Jede Neuerzeugung der Trigger-Zeilen (jedes `renderTriggers`, jede Property-Zeile) fuegt einen weiteren Listener hinzu, der den alten Input und die Closure festhaelt. Die Listener ueberleben das Schliessen des Modals. Bei haeufiger Bearbeitung waechst die Zahl kontinuierlich.
- **Beleg:**
  ```ts
  // RuleEditorModal.ts:333
  new PropertySuggest(this.app, propertyNameInput);
  ```
- **Fix:** Instanz speichern und in der Modal ueber `this.register(() => suggest.destroy())` registrieren (Modal ist ein Component-artiger Lebenszyklus mit `register`). Alternativ `refreshDataHandler` ueber `this.registerEvent` binden. Gleiches Muster fuer die Mobile-View.

### UI-08: Inline-Styles ueber `style.setProperty` in `BaseModal`

- **Schweregrad:** hoch (Richtlinienverstoss, formal nicht von der Lint-Regel erfasst)
- **Datei:Zeile:** `src/modals/BaseModal.ts:6-41` (Konstanten), `:166-171`, `:180-196` (setzen), `:217-225` (9x `removeProperty`)
- **Beschreibung:** Groessen und Mobile-Shell werden per `modalContainer.style.setProperty(..., 'important')` gesetzt. Die Richtlinie verlangt CSS-Klassen bzw. `setCssProps` statt `element.style.*`. Der Kommentar in Zeile 6 zeigt, dass die Werte bewusst als Variablen uebergeben werden, "for lint". Das umgeht die Intention der Regel, ohne sie zu verletzen. Die Werte sind statisch (Breiten 400/860/980 px, 100vh/100dvh), also CSS-faehig. `styles.css` enthaelt 0 `!important`-Regeln.
- **Beleg:**
  ```ts
  modalContainer.style.setProperty(property, value, MODAL_SHELL_STYLE_PRIORITY);
  ```
- **Fix:** Klassen `.advancedNoteMover-modal-size-small|medium|large` und `.advancedNoteMover-modal-size-mobile` in `styles.css` definieren (Spezifitaet statt `!important`, z. B. `.modal.advancedNoteMover-modal-size-medium` mit `!important` nur wo Obsidians Core-Regeln greifen). Die Entfernung ueber `removeProperty` entfaellt damit komplett.

### UI-09: Zwei parallele Settings-UIs mit bereits abweichenden Texten

- **Schweregrad:** hoch
- **Datei:Zeile:** `src/settings/settingDefinitions.ts` (766 Zeilen, deklarativ, ab Obsidian 1.13) vs. `src/settings/sections/*.ts` (imperativ, aeltere Versionen); Weiche in `src/settings/Settings.ts:99-132` (`getSettingDefinitions`, `callOptionalTabApi`)
- **Beschreibung:** Dieselbe Oberflaeche ist zweimal implementiert: einmal als `display()`-Pfad, einmal als `getSettingDefinitions()`-Pfad. Bereits abweichend:
  - Add-Button: `'+ add rule'` (`RulesSettingsSection.ts:99`) vs. `name: 'Add rule'` (`settingDefinitions.ts:239`)
  - Fallback-Name: `'Unnamed Rule'` (`RulesSettingsSection.ts:179, 201, 230`) vs. `'Unnamed rule'` (`settingDefinitions.ts:251`), und `'New filter'` nur deklarativ (`:162`)
  - Regel-Gruppe: imperativ Heading "Rules" plus Beschreibung (`RulesSettingsSection.ts:23-32`), deklarativ `name: 'Move rules'` (`settingDefinitions.ts:175`)
  - "Automatic conflict handling" existiert nur deklarativ (`settingDefinitions.ts:306`)
    Die Vorlage-Konstanten (`SETTINGS_CONSTANTS.UI_TEXTS`) werden nur teilweise genutzt. Jede Textaenderung muss doppelt gepflegt werden. Die API-Doku sagt nur, dass `getSettingDefinitions` ab 1.13 existiert; ob `display()` dann nicht mehr aufgerufen wird, ist zu pruefen.
- **Fix:** Entscheiden: entweder nur deklarativ (dann `minAppVersion` anheben oder aeltere Pfade bewusst entfernen) oder die imperativen Sektionen als einzige Quelle behalten und die Definitionen daraus ableiten. Gemeinsame Texte aus `SETTINGS_CONSTANTS` beziehen.

---

## Befunde: mittel

### UI-10: Title Case in UI-Texten (Sentence-Case-Verstoss)

- **Schweregrad:** mittel
- **Datei:Zeile:** siehe Liste
- **Beschreibung:** Die Richtlinie verlangt Sentence Case. Die Lint-Regel `obsidianmd/ui/sentence-case` greift nicht auf alle Aufrufe (z. B. `options.title`, `NOTIFICATION_CONSTANTS`, Konstanten). Gefundene Verstoesse:
  - `src/modals/RuleEditorModal.ts:60`: `'Rule Editor'` (Mobile: `'Rule editor'`, also inkonsistent)
  - `src/modals/RuleEditorModal.ts:329`: `placeholder: 'Property Name'`
  - `src/modals/PreviewModal.ts:34`: `title: 'Move Preview'`
  - `src/modals/HistoryModal.ts:134`: `'Bulk Move'` / `'Periodic Move'`
  - `src/modals/UpdateModal.ts:141, 157, 173, 189, 205, 221, 237`: `'Breaking Changes'`, `'New Features'`, `'Bug Fixes'` (Ueberschriften, siehe UI-11)
  - `src/config/constants.ts:70, 73`: `'Clear History'` (Titel und Bestaetigungsbutton), Setting heisst aber `'Clear history'` (`HistorySettingsSection.ts:22`)
  - `src/config/constants.ts:75-76`: Buttons `'Export Settings'`, `'Import Settings'`; `:82`: `'Import Settings'` (Titel)
  - `src/config/constants.ts:96-97`: `'This Week'`, `'This Month'`
  - `src/config/constants.ts:106`: `'Retention Policy'` (auch Setting-Name, `settingDefinitions.ts:320`)
  - `src/config/constants.ts:67`: `'Undo All'`
  - `src/modals/RuleEditorModal.ts:242`: `'Conditions:'` (h3, Doppelpunkt im Titel)
  - `src/settings/sections/RulesSettingsSection.ts:340`: `'New Rule'`
  - `src/settings/sections/RulesSettingsSection.ts:99`: `'+ add rule'` und `src/modals/RuleEditorModal.ts:255`: `'+ add condition'` (Kleinbuchstabe nach Symbol; der Changelog behauptet "Sentence-case UI" mit genau diesem Beispiel, `src/generated/changelog.ts:109`)
- **Fix:** Texte auf Sentence Case umstellen; Konstanten zentral pflegen und Lint-Abdeckung mit `options.title`/`setButtonText` pruefen. Changelog-Aussage korrigieren.

### UI-11: Lint-Ausnahme fuer UpdateModal umgeht die Sentence-Case-Regel

- **Schweregrad:** mittel
- **Datei:Zeile:** `eslint.config.mjs` (Block `files: ['src/modals/UpdateModal.ts']`, Regel `'obsidianmd/ui/sentence-case': 'off'`), `src/modals/UpdateModal.ts:141-237`
- **Beschreibung:** Die Ausnahme begruendet "intentional title-style casing". Im Review wird genau diese Konvention bemaengelt. Betroffen sind die sechs Changelog-Ueberschriften in `UpdateModal.ts` (UI-10); der Modal-Titel selbst ist Satzgroschreibung.
- **Fix:** Ausnahme entfernen, Ueberschriften in Sentence Case (`'Breaking changes'`, `'New features'`, `'Bug fixes'`) umstellen, Emoji-Praefixe entfernen (s. UI-12).

### UI-12: Emojis als Icon-Ersatz in Titeln und Listen

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/modals/PreviewModal.ts:35` (`titleIcon: '🔍'`), `:91` (`'✅ Files to be moved ...'`); `src/modals/HistoryModal.ts:135` (`'📦' : '🕐'`), `:139`, `:174`, `:355` (`'📄 ...'`); `src/modals/ConflictSkipCacheModal.ts:18` (`'⚠️'`); `src/modals/UpdateModal.ts:20` (`'🎉'`), `:141-237` (je Abschnitt ein Emoji)
- **Beschreibung:** Icons werden an mehreren Stellen als Emoji-Text eingebaut, anderswo als Lucide-Icon (`setIcon`). Emojis sind nicht themed, werden von Screenreadern vorgelesen und passen nicht zur Obsidian-Oberflaeche. `⚡` wird zudem doppelt verwendet (Improvements und Performance).
- **Fix:** `setIcon` mit Obsidian-Icons verwenden (`alert-triangle`/`triangle-alert`, `file-text`, `check`, `party-popper` bzw. Lucide-Entsprechung). Icons per `aria-hidden` ausblenden, wenn der Text den Sinn traegt.

### UI-13: Stille Fehler und irrefuehrende Hinweise "Check console for details"

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/modals/HistoryModal.ts:452-456` (Desktop, Single-Entry-Undo ohne else), `:401-408` (Mobile, ohne Fehlermeldung); `src/modals/PreviewModal.ts:334`; `src/modals/HistoryModal.ts:322`; `src/utils/Error.ts:18-42`
- **Beschreibung:** Beim Undo einer einzelnen Historie-Zeile erfolgt bei Misserfolg keinerlei Rueckmeldung (Bulk-Undo dagegen schon). `handleError` zeigt nur eine Notice und loggt NICHT in die Konsole, obwohl der Kommentar "Handles errors consistently by logging them" behauptet. Die Meldungen "Check console for details." verweisen daher auf eine Konsole, in der nichts Passendes steht.
- **Beleg:**
  ```ts
  const success = await this.historyManager.undoEntry(entry.id);
  if (success) {
    this.onOpen();
  } // kein else
  ```
- **Fix:** Einheitliche Fehlermeldung auch im Single-Undo; `handleError` tatsaechlich `console.error` aufrufen lassen (oder Kommentar und Meldungstext anpassen).

### UI-14: Notice-Flut bei Bulk-Fehlern und bei Eingabe

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/modals/PreviewModal.ts:298-301` (pro fehlgeschlagener Datei eine Notice), `src/settings/sections/PeriodicMovementSettingsSection.ts:101-118` (Notice je ungueltigem Tastendruck)
- **Beschreibung:** `handleError(..., false)` zeigt pro Fehler eine eigene Notice (Dauer 15 s). Bei hunderten Dateien mit gleichem Fehler entsteht eine Kaskade. Beim Eingeben des Intervalls erscheint "Interval must be a number" bei jedem ungueltigen Zeichen, z. B. beim Loeschen des Feldes.
- **Fix:** Fehler im Bulk sammeln und einmal am Ende zusammengefasst melden (die vorhandene Zusammenfassung in `PreviewModal.ts:328-336` um Fehlerdetails erweitern). Intervall-Validierung inline (Feldhinweis) statt Notice, bei Blur oder Enter.

### UI-15: Bulk-Vorschau laeuft nach dem Schliessen weiter, ohne Abbruch

- **Schweregrad:** mittel (im Browser pruefen)
- **Datei:Zeile:** `src/modals/PreviewModal.ts:214-239` (AbortController nur ueber Stop-Button), `:316` (`this.close()`)
- **Beschreibung:** Waehrend `executeMoves` laeuft, kann der Nutzer die Modal mit Esc oder dem Schliessen-Symbol beenden. Der Verschiebe-Loop ist an den `AbortController` gebunden, nicht an die Modal-Lebensdauer. Die Verschiebung laeuft im Hintergrund weiter, ohne Feedback. Der Stop-Button ist dann nicht mehr sichtbar.
- **Fix:** `onClose()` ueberschreiben und `abortCtl.abort()` aufrufen, oder `close()` waehrend eines laufenden Vorgangs blockieren (Muster aus `RuleEditorModal.close`).

### UI-16: Befehl "Move all files in vault" verschiebt ohne Vorschau und Bestaetigung

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/handlers/CommandHandler.ts:32-38`, `src/core/AdvancedNoteMover.ts:421-428`
- **Beschreibung:** Der Befehl ruft `moveAllFilesInVault()` direkt auf. Es gibt keinen ConfirmModal-Schritt. Parallel existiert der Befehl "Preview bulk movement for all files" mit Vorschau. Die Historie erlaubt zwar ein Undo, aber ein Massenverschieben ohne Bestaetigung ist fuer Nutzer ein Risiko. Die Richtlinie verbietet das nicht, es ist aber ein haeufiger Review-Kommentar.
- **Fix:** Bestaetigungsdialog mit Anzahl (ConfirmModal, `danger: true`), oder Befehl auf den Vorschau-Flow umleiten.

### UI-17: Plural-Fehler ("1 files") in Meldungen und Buttons

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/modals/PreviewModal.ts:201` (`Move ${n} files`), `:326` (`file(s)`, Plural-Hack), `:329` (`Successfully moved ${n} files!`), `:331` (`Moved ${n} files.`)
- **Beschreibung:** Bei genau einer Datei entsteht "Move 1 files" bzw. "Successfully moved 1 files!". `ConflictSkipCacheModal.ts:243` loest das Plural dagegen korrekt (`entr${removed === 1 ? 'y' : 'ies'}`), was die Inkonsistenz zeigt.
- **Fix:** Gemeinsamen Helfer `pluralize(n, 'file', 'files')` verwenden.

### UI-18: UpdateModal: unsicherer Cast und Renderer ohne Lebenszyklus

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/modals/UpdateModal.ts:111-120`
- **Beschreibung:** `MarkdownRenderer.render(..., this as unknown as Component)`. `Modal` ist laut `obsidian.d.ts` keine `Component`-Klasse, der Cast verdeckt das. Pro Changelog-Zeile wird gerendert, ohne dass dieser Component je entladen wird. `ConfirmModal` und `ConflictModal` machen es richtig (eigene `new Component()` mit `unload()` in `onClose`).
- **Beleg:**
  ```ts
  void MarkdownRenderer.render(
    this.app,
    markdown,
    item,
    '',
    this as unknown as Component
  );
  ```
- **Fix:** Ein `messageRenderComponent` wie in `ConfirmModal` anlegen, in `onOpen` laden und in `onClose` entladen.

### UI-19: UpdateModal: sechs fast identische Changelog-Bloecke

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/modals/UpdateModal.ts:136-246`
- **Beschreibung:** Fuer jede der sechs Kategorien (breaking, features, improvements, bugFixes, changes, fixes, performance) steht derselbe Block aus `if`, `createDiv`, `createEl('h4')`, `createEl('ul')`, `forEach`. Ca. 110 Zeilen Kopie. Jede Kategorie-Aenderung braucht sieben Stellen.
- **Fix:** Konfigurationsarray `[{key, label, cls}]` und eine Schleife; die Emoji-Labels (UI-12) dabei entfernen.

### UI-20: HistoryModal: Mobile/Desktop-Zweige und vierfach dupliziertes Open/Undo

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/modals/HistoryModal.ts:117-338` (Bulk-Eintrag, 222 Zeilen), `:340-469` (Einzel-Eintrag, 130 Zeilen); Open-Logik `:196-214`, `:252-273`, `:375-394`, `:426-446`; Undo-Logik `:222-234`, `:278-290`, `:401-408`, `:449-456`
- **Beschreibung:** Dieselbe Open-Logik (Ziel-Datei oeffnen, sonst Quelle, sonst Notice) existiert viermal; Undo ebenso. Desktop und Mobile sind je vollstaendig ausgeschrieben, was zu den Abweichungen aus UI-13 fuehrt. `refreshContent`-Logik ist ueber `this.onOpen()` gemischt.
- **Fix:** Helfer `openHistoryEntryFile(entry)` und `undoHistoryEntry(entry)`, nur das Layout nach Plattform verzweigen. Re-Render ueber eine Methode `refreshContent()`.

### UI-21: RuleEditorModal: zu viele Verantwortlichkeiten, DOM-Eingriff beim Umsortieren

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/modals/RuleEditorModal.ts:407-449` (manuelles DOM-Verschieben nach DnD), `:274, 415, 427, 434` (non-null `!`), `:442-445` (no-op `onSave: async () => Promise.resolve()`), `:523-525` (`requestClose` als `async` ohne `await`)
- **Beschreibung:** Die Klasse (557 Zeilen) vereint Layout, Trigger-Rendering, DnD, Footer und Discard-Logik. Nach dem Umsortieren wird das DOM manuell umgehaengt, obwohl die Datenquelle ohnehin neu gerendert werden koennte. Die Logik fuer `adjustedToIndex` ist fehleranfaellig (Doppel-Offset-Korrektur).
- **Fix:** Nach `moveTrigger` einfach `renderTriggers()` aufrufen; Trigger-Zeile, Footer und Discard-Handling in eigene Klassen auslagern; non-null-Assertions durch lokale Guards ersetzen.

### UI-22: Zwei Regeleditoren (Desktop und Mobile) mit doppelter Logik

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/modals/RuleEditorModal.ts:178-234` (Destination, Ordner-Erstellung) vs. `src/modals/rule-editor/RuleEditorMobileView.ts:191-251` (identische Felder); Platzhalter-Abweichung `'Property Name'` (`RuleEditorModal.ts:329`) vs. `'Property name'` (`RuleEditorMobileView.ts:460`)
- **Beschreibung:** Beide Ansichten bauen dieselben Felder in unterschiedlichen DOM-Strukturen (zusammen ca. 1.090 Zeilen). Gemeinsame Helfer existieren (`ruleEditorShared.ts`), aber Aufbau, Beschriftung und Verhalten laufen auseinander (Mobile hat bessere a11y, Desktop nicht). Aenderungen muessen zweimal gemacht werden.
- **Fix:** Gemeinsame Feld-Definitionen (Label, Platzhalter, Beschreibung, Handler) in `ruleEditorShared.ts`; nur das Layout bleibt getrennt. Mittelfristig die a11y-Muster der Mobile-View auf den Desktop uebertragen.

### UI-23: Aggregations-Umschalter ohne vollstaendige Semantik

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/modals/RuleEditorModal.ts:148-176` (Desktop: `<button>` mit Klasse `is-active`, kein `aria-pressed`, keine Gruppenbeschriftung); `src/modals/rule-editor/RuleEditorMobileView.ts:157-186` (Mobile: `role="radiogroup"`, `role="radio"`, roving `tabIndex`, aber keine Pfeiltasten-Behandlung)
- **Beschreibung:** Desktop-Umschalter sind fuer Screenreader nicht als Auswahl erkennbar. Mobile setzt Radio-Rollen, ohne die fuer `radio` vorgeschriebene Pfeiltasten-Navigation umzusetzen (das roving tabIndex wirkt nur bei Tab).
- **Fix:** Desktop: `role="radiogroup"` mit `aria-labelledby` und `role="radio"`/`aria-checked` wie mobil. Mobile: `keydown` fuer Pfeiltasten ergaenzen.

### UI-24: Eingabefelder ohne programmatisch verknuepftes Label

- **Schweregrad:** mittel (Screenreader pruefen)
- **Datei:Zeile:** `src/modals/RuleEditorModal.ts:125-133` (Name), `:179-190` (Destination-Suche); `src/settings/sections/FilterSettingsSection.ts:146-163` (Filter-Suche, Placeholder); `src/settings/sections/PeriodicMovementSettingsSection.ts:95-100` (Intervall)
- **Beschreibung:** `Setting.setName()` setzt keinen `<label for>` auf das Input. Die Felder sind nur ueber Placeholder oder den Setting-Namen erreichbar, der fuer Screenreader nicht als Name des Inputs gilt. Die Mobile-View (`createField`) zeigt, wie es richtig geht.
- **Fix:** `aria-label` auf den Input setzen (gleicher Text wie der Setting-Name) oder `inputEl.id` mit einem `<label>` verknuepfen.

### UI-25: Toter Code und ungenutzte Konstanten

- **Schweregrad:** mittel (Wartung)
- **Datei:Zeile:** siehe Liste; Nutzungszaehlung per grep ueber `src/` (ohne Tests)
- **Beschreibung:** Ungenutzt (nur Definition gefunden):
  - `src/utils/MobileUtils.ts:52-61` `getMobileClass()`; `:71-93` `createMoveButton()`; `:103-125` `createActionButton()`; `isTablet()` (`:19-21`) nur intern genutzt
  - `src/utils/DragDropManager.ts:250-260` `wrapWithDragHandle()`; `getItemData()` (`:212-219`) und `draggedData` (Zeilen 19, 65, 200) nur geschrieben, nie gelesen
  - `src/settings/suggesters/PropertySuggest.ts:61-63` `getAllProperties()`
  - `src/utils/NoticeManager.ts:80-82` `update()`
  - `src/modals/ConflictModal.ts:186-192` `static show()` (Aufrufer nutzt `new ConflictModal(...)`, `src/application/conflict-modal-coordinator.ts:38`)
  - `src/modals/HistoryModal.ts:471-473` und `src/modals/UpdateModal.ts:250-252`: `onClose()`-Overrides ohne Logik
  - `src/config/constants.ts`: `UI_TEXTS.EXPORT_SETTINGS_TITLE`, `_MESSAGE`, `_CONFIRM` (`:77-81`), `EXPORT_ERROR` (`:90`), `IMPORT_ERROR` (`:88`), `UNDO` (`:68`); `PLACEHOLDER_TEXTS.FOLDER_PATH` (`:59`), `CRITERIA` (`:62`), `PATH` (`:63`)
  - `src/settings/sections/ImportExportSettingsSection.ts:343` Vergleich mit einem nie geworfenen Text
  - `src/modals/RuleEditorModal.ts:442-445` no-op-`onSave`
  - `src/modals/BaseModal.ts:217-218` `removeProperty('display')`/`('flex-direction')` ohne vorheriges Setzen
- **Fix:** Entfernen bzw. bei `getMobileClass`/`createMoveButton` pruefen, ob sie fuer UI-02 wiederverwendet werden sollen (dann behalten und nutzen).

### UI-26: Hartkodierte Debug-Version und Release Notes nicht erneut oeffnenbar

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/core/UpdateManager.ts:46-55` (`forceShow`), Aufrufer nur `:30` (ohne Argument); `src/settings/sections/UpdateSettingsSection.ts:13-27`
- **Beschreibung:** Der manuelle Pfad `showUpdateModal(true)` setzt bei gleicher Version hart `'0.4.7'` als Basis. Es gibt keinen Aufrufer mit `true`. Nutzer haben keinen Befehl und keinen Button, um das Changelog erneut zu oeffnen. Die Option "Show release notes after plugin update" ist der einzige Weg.
- **Fix:** Befehl "Show what's new" bzw. Button in der Updates-Sektion mit `showUpdateModal(true)`; die Basisversion aus dem Changelog ableiten statt hart zu codieren.

### UI-27: Intervall-Eingabe mit `parseInt` und Timer-Neustart pro Tastendruck

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/settings/sections/PeriodicMovementSettingsSection.ts:95-125`
- **Beschreibung:** `parseInt(value)` akzeptiert `"5abc"` als 5. Bei jedem Tastendruck werden `save_settings()` und `togglePeriodic()` aufgerufen, also der Intervall-Timer neu gestartet. Ungueltige Eingaben werden nur gemeldet, nicht ausgeschlossen (siehe UI-14).
- **Fix:** Strikte Pruefung (`/^\d+$/`), Persistieren beim Blur/Enter, Feldhinweis statt Notice.

### UI-28: isMobile-Verzweigungen und Klassen-Boilerplate

- **Schweregrad:** mittel
- **Datei:Zeile:** Beispiele `src/modals/PreviewModal.ts:79-105, 116-118, 154-156, 190-192`, `src/modals/UpdateModal.ts:47-81, 126-128`, `src/modals/HistoryModal.ts:90-92, 123-125, 343-345`, `src/settings/sections/PeriodicMovementSettingsSection.ts:42-53, 76-87, 128-148`, `src/settings/sections/HistorySettingsSection.ts:42-55, 107-118, 135-146`
- **Beschreibung:** In `modals/` und `settings/` steht `isMobile` an 76 Stellen. 20 Mal wird eine `cls`-Zeichenkette per Ternary gebaut (`isMobile ? 'a b c' : 'a b'`). 14 Mal wird `advancedNoteMover-mobile-optimized` gesetzt, und 12 Mal wird `(controlEl as HTMLElement).addClass(...)` mit `querySelector('.setting-item-control')` geschrieben. Das macht Aenderungen fehleranfaellig.
- **Beleg:**
  ```ts
  const controlEl = onEditSetting.settingEl.querySelector(
    '.setting-item-control'
  );
  if (controlEl) {
    (controlEl as HTMLElement).addClass(
      'advancedNoteMover-mobile-toggle-control'
    );
  }
  ```
- **Fix:** Helfer `applyMobileSettingClasses(setting, controlCls?)` und `mobileCls(base, mobileExtra)`; `querySelector` durch `setting.controlEl` ersetzen (Obsidian-API, kein Cast).

### UI-29: Property-Extraktion drei- bis viermal dupliziert

- **Schweregrad:** mittel
- **Datei:Zeile:** `src/settings/suggesters/AdvancedSuggest.ts:95-141`, `src/settings/suggesters/PropertySuggest.ts:46-80`, `src/settings/suggesters/FolderSuggest.ts:441-470`, plus `src/core/MetadataExtractor.ts`
- **Beschreibung:** Jede Suggest-Klasse liest selbst `metadataCache.getFileCache(...).frontmatter`, filtert `position*`/`tags` und sammelt Werte. Einige Pfade nutzen den `vaultIndexCache`, andere nicht. Die Filterregeln koennen auseinanderlaufen.
- **Fix:** Einheitliche Quelle (`MetadataExtractor` bzw. `vaultIndexCache`), Suggester nur darauf zugreifen lassen.

---

## Befunde: niedrig

### UI-30: Hartkodierte und uneinheitliche Texte und Fallbacks

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/modals/RuleEditorModal.ts:507, 532` und `src/settings/sections/RulesSettingsSection.ts:206` (`cancelText: 'Cancel'`, statt Konstante); `src/modals/ConflictSkipCacheModal.ts:255`; `src/modals/ConfirmModal.ts:27-28` (Default `'OK'`/`'Cancel'`) plus `:55, 72, 86, 97` (`|| 'OK'`/`|| 'Cancel'` doppelt); `src/settings/sections/RulesSettingsSection.ts:230` (`' (copy)'`); `'Unnamed Rule'` in `RulesSettingsSection.ts:179, 201, 230` und `settingDefinitions.ts:251, 581, 648`
- **Beschreibung:** Dieselben Texte stehen mehrfach hartkodiert oder mit abweichender Schreibweise. Default-Fallbacks werden doppelt gesetzt.
- **Fix:** In `SETTINGS_CONSTANTS.UI_TEXTS` zentralisieren (`CANCEL`, `OK`, `UNNAMED_RULE`, `COPY_SUFFIX`).

### UI-31: Regel-Klonen uneinheitlich

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/settings/sections/RulesSettingsSection.ts:229` (`JSON.parse(JSON.stringify(rule)) as RuleV2`) vs. `:334` (`structuredClone(...)`)
- **Beschreibung:** Zwei Klon-Methoden und ein Cast. `if (!rulesV2) rulesV2 = []` wird im Klon-Handler doppelt geprueft.
- **Fix:** `structuredClone` ueberall, Cast entfernen.

### UI-32: Plugin-Name in Notice-Titeln und Ribbon-Tooltip

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/config/constants.ts:33-37` (`'Advanced Note Mover info:'` usw.), `main.ts:68` (`addRibbonIcon('book-plus', 'Advanced Note Mover', ...)`)
- **Beschreibung:** Jede Notice beginnt mit dem Plugin-Namen plus Typ-Praefix. Das ist redundant und laut Richtlinie-Geist nicht noetig. Der Ribbon-Tooltip ist der einzige Text mit Plugin-Name in der Oberflaeche; das ist vertretbar, aber als Aktion formulierbar ("Move active note to note folder").
- **Fix:** Praefix entfernen oder auf das Notice-Icon/Farbe verlagern; Ribbon-Tooltip aus dem Befehlsnamen ableiten.

### UI-33: `console.*` im UI-Code

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/settings/sections/ImportExportSettingsSection.ts:320, 324` (`console.debug` im normalen Importpfad), `src/utils/NoticeManager.ts:45` (`console.error` im Undo-Handler)
- **Beschreibung:** Im Settings-Import wird bei jeder Migration in die Konsole geschrieben. Ausserhalb des UI-Codes gibt es ueber 40 weitere `console.*`-Aufrufe (z. B. `src/core/RuleMigrationService.ts`), das ist in Obsidian-Plugins unuebersichtlich.
- **Fix:** Einheitlichen Logger mit Debug-Schalter (oder `performanceTrace`-Muster); Migrations-Debug entfernen.

### UI-34: `window.*` statt `activeWindow`, `window.innerWidth`

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/utils/MobileUtils.ts:20` (`window.innerWidth`); `src/modals/BaseModal.ts:103-108, 267`; `src/modals/PreviewModal.ts:304-307`; `src/settings/suggesters/AdvancedSuggest.ts:49-54, 240`; `src/settings/suggesters/PropertySuggest.ts:34-39, 190`; `src/utils/DebounceManager.ts:22-51`; `src/core/TriggerEventHandler.ts:33, 40`
- **Beschreibung:** Fuer Popout-Fenster sollte `activeWindow` bzw. `activeDocument` verwendet werden. `ImportExportSettingsSection.ts:114` nutzt `activeDocument` bereits, daher inkonsistent.
- **Fix:** `activeWindow.setTimeout` etc.; `activeDocument` ueberall. Lint-Regel `preferWindowTimers` im Plugin pruefen, ob sie aktiviert werden kann.

### UI-35: Trace-Export ueber `vault.adapter.write`

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/infrastructure/debug/performance-trace.ts:97-108`
- **Beschreibung:** Der Ordner wird ueber die Vault-API angelegt, die Datei aber ueber `app.vault.adapter.write`. Die Richtlinie empfiehlt Vault-API-Methoden fuer Dateien im Vault. Die Pruefung `if (!folder)` ist zudem nicht atomar.
- **Fix:** `app.vault.create(path, json)`; `createFolder` mit try/catch absichern, falls der Ordner parallel entsteht.

### UI-36: Statusmeldungen nicht als Live-Region

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/modals/PreviewModal.ts:224-236` (Fortschritt "Moving files..."), `:234` (Stop-Status); `src/modals/ConflictModal.ts:97-102` (Warnung bei "Always use this choice")
- **Beschreibung:** Fortschritt und Warnungen werden per Textaenderung ausgegeben, ohne `aria-live`. Screenreader melden sie nicht.
- **Fix:** Container mit `aria-live="polite"` (Fortschritt) bzw. `role="alert"` (Warnung) anlegen.

### UI-37: Mehrdeutige Konfliktaktion "Rename"

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/modals/ConflictModal.ts:118-121` (Label `'Rename'`, Tooltip `'Move the note with a numeric suffix, for example note (1).md'`); `src/settings/sections/ConflictResolutionSettingsSection.ts:12` (`'Always rename'`)
- **Beschreibung:** "Rename" beschreibt nicht, dass die Notiz behalten und mit Zaehler gespeichert wird. Die Aktion "Keep in place" ist ebenfalls nicht selbsterklaerend, weil nicht klar ist, dass ein Eintrag im Cache entsteht.
- **Fix:** Labels wie "Keep both (add number)" bzw. "Skip and remember" waehlen; Tooltips und Settings-Labels angleichen.

### UI-38: Settings-Tab: doppelte Instanziierung, Datei-/Klassennamen abweichend, gemischte Importpfade

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/settings/Settings.ts:41-84` (Konstruktor) und `:167-215` (`renderSettingsTab`), `debouncedDisplay` zweimal; `src/settings/sections/PeriodicMovementSettingsSection.ts:7` (Klasse `TriggerSettingsSection`), `src/settings/sections/index.ts:1` (Alias); Importe `main` vs. `src/...` vs. `../` (z. B. `ImportExportSettingsSection.ts:1-12`)
- **Beschreibung:** Alle Sektionen werden im Konstruktor und noch einmal in jeder Anzeige neu erzeugt. Die Datei heisst `PeriodicMovement...`, die Klasse `TriggerSettingsSection`, und Importe sind gemischt. Das erschwert das Lesen.
- **Fix:** Sektionen einmalig erzeugen oder nur in `display()`, Datei und Klasse angleichen, Importpfade vereinheitlichen.

### UI-39: DOM-Umhaengen und Entfernen von Setting-Teilen (fragil)

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/settings/sections/RulesSettingsSection.ts:272-275` (Control-Element wird in eigenen Container verschoben), `:162-163` und `src/settings/sections/FilterSettingsSection.ts:94` (`s.infoEl.remove()`)
- **Beschreibung:** Die Regelzeile benutzt Obsidians interne Struktur (`.setting-item-control`) und verschiebt sie. Ein Update der Obsidian-Struktur kann das brechen.
- **Fix:** Layout mit eigenen Elementen aufbauen; `Setting` nur fuer Beschriftung und Control verwenden, oder die Zeile ohne `Setting` rendern.

### UI-40: ConfirmModal: Mobile-/Desktop-Zweig teilweise redundant

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/modals/ConfirmModal.ts:54-78` (Mobile mit `Setting`-Buttons), `:81-107` (Desktop mit `createButton`); redundantes `if/else` mit doppeltem `setCta()` in `:55-61`
- **Beschreibung:** Beide Zweige erzeugen dieselben Aktionen mit verschiedenem Markup. Der `danger`-Zweig ruft in beiden Faellen `setCta()`.
- **Fix:** Eine Buttonfabrik fuer beide Layouts; nur das Container-Layout verzweigen.

### UI-41: Modal-Titel uneinheitlich (h2 vs. native Titelzeile)

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/modals/BaseModal.ts:234-258` (eigenes `<h2>`, Option `useNativeTitle`), `src/modals/RuleEditorModal.ts:60-61` (Mobile nativ, Desktop eigenes `<h2>`)
- **Beschreibung:** Dieselbe Modal-Art nutzt auf Desktop einen eigenen Titel, auf Mobile den nativen. Die native Titelzeile ist die Obsidian-Konvention und fuer Screenreader zuverlaessiger.
- **Fix:** Ueberall `this.setTitle()` (native Titelzeile) verwenden; eigene `<h2>`-Ausgabe entfernen.

### UI-42: DragDropManager: ungeprueftes `event.target`, O(n) pro `dragover`

- **Schweregrad:** niedrig
- **Datei:Zeile:** `src/utils/DragDropManager.ts:53, 86, 121, 137, 161` (`event.target as HTMLElement`), `:203-210` (`getItemIndex` ruft `querySelectorAll` bei jedem Ereignis auf)
- **Beschreibung:** Das Ziel eines Drag-Events kann ein Textknoten sein; `closest` waere dann nicht verfuegbar. `getItemIndex` durchsucht bei jedem `dragover` alle Items.
- **Fix:** `event.target instanceof Element` pruefen; Items bei Start einmal cachen.

### UI-43: Suggest-Instanzen im Regeleditor nicht verwaltet

- **Schweregrad:** niedrig (pruefen)
- **Datei:Zeile:** `src/modals/RuleEditorModal.ts:182` (`new FolderSuggest(this.app, cb.inputEl);` ohne Speicherung), `src/modals/rule-editor/RuleEditorMobileView.ts:208`, `src/modals/rule-editor/ruleEditorShared.ts:138-152`
- **Beschreibung:** `AbstractInputSuggest` haengt sich an das Input-Element. Es gibt keine Verwaltung und kein `destroy`. Solange keine globalen Listener registriert werden (wie bei PropertySuggest, UI-07), ist das vermutlich unkritisch. Ob Obsidian die Listener beim Entfernen des Elements loest, ist im Browser zu pruefen.
- **Fix:** Instanzen im Modal sammeln und in `onClose` aufraeumen, sobald ein Cleanup-Bedarf besteht.

---

## Konform (Stichprobe)

- Kein `innerHTML`/`outerHTML`/`insertAdjacentHTML` in `src/` oder `main.ts` (nur ein Changelog-Text erwaehnt es).
- Kein `any`-Typ in UI-Code; Casts vorhanden (ca. 65 Stellen mit `as`, s. UI-28 und UI-31), `as unknown as` nur in UI-18.
- Settings-Ueberschriften einheitlich mit `new Setting(...).setName(...).setHeading()`; keine `h2/h3` im Settings-Tab.
- Kein Plugin-Name als Settings-Ueberschrift.
- Commands ohne Plugin-Name und ohne Default-Hotkeys (8 Befehle, siehe Inventar).
- Icons ueber `setIcon` (Obsidian-Lucide); keine Icon-Fonts.
- `registerEvent` fuer Vault-/Metadata-Events (`vault-event-hooks.ts`, `plugin-vault-index-cache.ts`); `onunload` raeumt Settings-Tab und Trigger auf (`main.ts:88-91`).
- Plattformerkennung zentral in `MobileUtils`; eigene Mobile-Ansicht fuer den Regeleditor.
- Esc/Overlay-Verhalten: Regeleditor fragt bei ungespeicherten Aenderungen nach (`RuleEditorModal.close`).
- ESLint (obsidianmd 0.3.0) ohne Befund auf den UI-Dateien.

## Offene Pruefpunkte fuer die Screenshot-Phase

- UI-01: Import-Dialog abbrechen; bleibt "Import Settings" disabled?
- UI-05: Property-Name mit bekanntem Property tippen; Fokus nach dem Treffer?
- UI-06: Konflikt-Cache-Modal mit mindestens einem Eintrag oeffnen, "Dismiss" klicken; Titel weg?
- UI-15: Bulk-Vorschau starten, waehrend des Laufs Esc druecken; laufen die Moves weiter?
- UI-23 und UI-24: Mit Tastatur (Tab, Pfeiltasten) durch Trigger-Zeilen navigieren; Screenreader-Namen pruefen.
- UI-37: Icons `alert-triangle` (ConflictModal) und `cross` (FilterSettings) gegen die Obsidian-Icon-Liste pruefen; ggf. wird ein Icon nicht gerendert.

---

## UI-Komponenten-Inventar

Oeffnungsweg: Settings-Tab ueber `app.setting.openTabById("note-mover-shortcut")` (Desktop) bzw. `app.emulateMobile(true)` plus Plugin-Neuaktivierung (Mobile), wie in `docs/analysis/README.md` beschrieben. Vorhandene Screenshots aus `docs/analysis/screenshots/` sind in der letzten Spalte genannt. Die Zuordnung `desktop-settings-secN` zu den Sektionen ist eine Annahme nach Reihenfolge und sollte per Bild bestaetigt werden.

### A. Settings-Tab (Sektionen in Reihenfolge)

| Nr  | Sektion (Heading)   | Datei                                                                           | Inhalt                                                                                                                                                                      | Oeffnen                                                                  | Screenshot                               |
| --- | ------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| S0  | Triggers            | `sections/PeriodicMovementSettingsSection.ts` (Klasse `TriggerSettingsSection`) | Schalter On-edit und Periodic, Intervall (nur bei Periodic)                                                                                                                 | Settings > Advanced Note Mover, erster Block                             | `desktop-settings-sec0.png` (vermutlich) |
| S1  | Filter              | `sections/FilterSettingsSection.ts`                                             | Blacklist-Zeilen mit Suche, Drag-Handle, Loeschen; Button "Add new filter"                                                                                                  | Zweite Sektion                                                           | `desktop-settings-sec1.png` (vermutlich) |
| S2  | Rules               | `sections/RulesSettingsSection.ts`                                              | Hinweistext, Toggle "Create missing destination folders", Regelliste (Name, Loeschen, Klonen, Bearbeiten, Aktiv-Toggle, Drag), "Re-evaluate vault" mit Button, "+ add rule" | Dritte Sektion                                                           | `desktop-settings-sec2.png` (vermutlich) |
| S3  | Attachments         | `sections/AttachmentsSettingsSection.ts`                                        | Schalter "Move attachments with note"; Unterschalter erscheinen nur bei aktivem Schalter                                                                                    | Vierte Sektion                                                           | `desktop-settings-sec3.png` (vermutlich) |
| S4  | Conflict resolution | `sections/ConflictResolutionSettingsSection.ts`                                 | Dropdown "When target file exists"; Warnung bei "Always overwrite"                                                                                                          | Fuenfte Sektion; Warnung durch Umstellen auf "Always overwrite" sichtbar | `desktop-settings-sec4.png` (vermutlich) |
| S5  | History             | `sections/HistorySettingsSection.ts`                                            | Retention (Wert + Einheit), "Clean up now", "Clear history"                                                                                                                 | Sechste Sektion; Clear-Dialog ist ConfirmModal                           | `desktop-settings-sec5.png` (vermutlich) |
| S6  | Import/export       | `sections/ImportExportSettingsSection.ts`                                       | Buttons "Export Settings", "Import Settings"                                                                                                                                | Siebte Sektion                                                           | `desktop-settings-sec6.png` (vermutlich) |
| S7  | Performance         | `sections/PerformanceDebugSettingsSection.ts`                                   | Drei Schalter, Button "Export trace JSON" (nur bei Debug aktiv)                                                                                                             | Achte Sektion                                                            | `desktop-settings-sec7.png` (vermutlich) |
| S8  | Updates             | `sections/UpdateSettingsSection.ts`                                             | Schalter "Show release notes after plugin update"                                                                                                                           | Neunte Sektion                                                           | `desktop-settings-sec8.png` (vermutlich) |

Hinweis: Die Sektionen S0 bis S8 gelten auch fuer die deklarative Variante (`settingDefinitions.ts`, Obsidian 1.13+, s. UI-09). Die Screenshots `desktop-settings-top.png` und `mobile-settings-top.png` zeigen den Tab-Kopf.

### B. Modals

| Nr  | Modal                                           | Datei                                            | Zweck                                                                                                                                  | Oeffnen                                                                                                                                                                                                                                                     | Screenshot                                                                                                                                                                                                   |
| --- | ----------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1  | Rule Editor (Desktop)                           | `src/modals/RuleEditorModal.ts`                  | Regel anlegen/bearbeiten: Name, Aktiv, Match (All/Any/None), Destination, Ordner-Erstellung, Conditions, Footer mit Remove/Cancel/Save | Settings > Rules > "+ add rule" bzw. Stift-Icon an einer Regel                                                                                                                                                                                              | `desktop-modal-rule-editor.png`                                                                                                                                                                              |
| M2  | Rule Editor (Mobile-Ansicht)                    | `src/modals/rule-editor/RuleEditorMobileView.ts` | Gleiche Funktion, touch-first, Karten pro Condition, Footer Cancel/Save                                                                | Wie M1 mit emulierter Mobile-Ansicht                                                                                                                                                                                                                        | `mobile-modal-rule-editor.png`, `mobile-modal-rule-editor-bottom.png`                                                                                                                                        |
| M3  | Bestaetigung (ConfirmModal)                     | `src/modals/ConfirmModal.ts`                     | Allgemeiner Dialog fuer Loeschen, Clear, Import, Verwerfen, Konflikt-Cache-Leeren                                                      | Regel loeschen (Papierkorb in Settings > Rules); Clear history; Import settings (nach Dateiauswahl); Editor mit ungespeicherten Aenderungen schliessen; "Clear all" im Konflikt-Cache                                                                       | keiner                                                                                                                                                                                                       |
| M4  | Move Preview (PreviewModal)                     | `src/modals/PreviewModal.ts`                     | Liste geplanter Verschiebungen, Buttons "Move N files" und "Cancel", Fortschritt und Stop                                              | Befehle "Preview bulk movement for all files", "Preview active note movement", "Re-evaluate entire vault with current rules" bzw. Settings > Rules > "Re-evaluate vault with current rules"                                                                 | `desktop-modal-preview-bulk-movement.png`, `desktop-modal-preview-note-movement.png`, `desktop-modal-re-evaluate-vault-with-rules.png`, `mobile-modal-preview.png`, `mobile-modal-preview-note-movement.png` |
| M5  | History (HistoryModal)                          | `src/modals/HistoryModal.ts`                     | Historie mit Zeitfilter, Bulk- und Einzeleintraegen, Open/Undo/Blacklist                                                               | Befehl "Show history" (braucht Eintraege; eine Notiz verschieben)                                                                                                                                                                                           | `desktop-modal-show-history.png`, `mobile-modal-show-history.png`                                                                                                                                            |
| M6  | Skipped move conflicts (ConflictSkipCacheModal) | `src/modals/ConflictSkipCacheModal.ts`           | Liste uebersprungener Konflikte, Open note/Retry/Dismiss, Remove stale, Clear all                                                      | Befehl "Review skipped move conflicts" (braucht Cache-Eintraege; Konflikt mit Strategie "Always skip" erzeugen)                                                                                                                                             | `desktop-modal-show-conflict-skip-cache.png`                                                                                                                                                                 |
| M7  | Konfliktdialog (ConflictModal)                  | `src/modals/ConflictModal.ts`                    | Entscheidung bei Dateikonflikt: Keep in place, Rename, Overwrite; Schalter "Always use this choice"                                    | In Settings > Conflict resolution Strategie "Ask every time" setzen (Standard ist "Always skip", `ConflictResolutionSettingsSection.ts:39`), dann eine Notiz in einen Ordner mit gleichnamiger Datei verschieben (Befehl "Move active note to note folder") | keiner                                                                                                                                                                                                       |
| M8  | What's new (UpdateModal)                        | `src/modals/UpdateModal.ts`                      | Changelog-Anzeige nach Versionswechsel, Link zu GitHub, Close                                                                          | Automatisch beim Start, wenn `lastSeenVersion` aelter ist und "Show release notes after plugin update" aktiv ist. Zum Testen `lastSeenVersion` in `data.json` auf eine aeltere Version setzen. Kein Befehl (s. UI-26)                                       | keiner                                                                                                                                                                                                       |

### C. Befehle (Command Palette)

| Command-ID                      | Anzeigename                                 | Handler                     | Hinweis                                                    |
| ------------------------------- | ------------------------------------------- | --------------------------- | ---------------------------------------------------------- |
| `trigger-note-movement`         | Move active note to note folder             | `CommandHandler.ts:17-29`   | nur bei aktiver verschiebbarer Datei aktiv (checkCallback) |
| `trigger-note-bulk-move`        | Move all files in vault                     | `CommandHandler.ts:32-38`   | ohne Vorschau und Bestaetigung (UI-16)                     |
| `show-history`                  | Show history                                | `CommandHandler.ts:41-51`   | oeffnet M5                                                 |
| `show-conflict-skip-cache`      | Review skipped move conflicts               | `CommandHandler.ts:54-63`   | oeffnet M6 (nach prune)                                    |
| `preview-bulk-movement`         | Preview bulk movement for all files         | `CommandHandler.ts:66-81`   | oeffnet M4                                                 |
| `re-evaluate-vault-with-rules`  | Re-evaluate entire vault with current rules | `CommandHandler.ts:84-97`   | oeffnet M4 mit Titel "Re-evaluate vault"                   |
| `preview-note-movement`         | Preview active note movement                | `CommandHandler.ts:100-125` | oeffnet M4 (nur mit aktiver Datei)                         |
| `add-current-file-to-blacklist` | Add current file to blacklist               | `CommandHandler.ts:128-154` | Notice, kein Modal                                         |

Keine Default-Hotkeys (konform).

### D. Ribbon und Notices

- Ribbon-Icon `book-plus`, Tooltip "Advanced Note Mover" (`main.ts:68-70`): verschiebt die aktive Notiz direkt (`moveFocusedNoteToDestination`), ohne Vorschau. Zum Sehen: linke Ribbon-Leiste.
- Notices (`src/utils/NoticeManager.ts`): zentrale Aufrufe in `src/core/AdvancedNoteMover.ts` (u. a. `:122`, `:137`, `:139`, `:294`, `:375` mit Undo-Button, `:385-409` Bulk-Ergebnisse, `:495`), `src/core/UpdateManager.ts:107`, Settings (Export/Import-Ergebnis, Trace-Export, Re-evaluate-Fehler), Modals (Konflikt-Cache, History-Fehler). Ein Screenshot mit Undo-Button entsteht nach einer Verschiebung im Befehl "Move active note to note folder" (Notice mit Button "Undo").
- Notice-Dauern: `src/config/constants.ts:24-31`.

### E. Sonstige Oberflaechen

- Dateiauswahl-Dialog (Import, UI-01): ueber Settings > Import/export > "Import Settings" und Bestaetigung.
- Download (Export): Settings > Import/export > "Export Settings" (kein Modal, Notice "Settings exported successfully").
- Trace-Export: Settings > Performance > "Export trace JSON" (nur mit aktivem Debug); Datei landet in `_note-mover-traces/` im Vault.
- Suggest-Dropdowns: Filter-Suche (Settings > Filter), Destination-Feld im Regeleditor (Folder-/Template-Vorschlaege mit `{{`), Property-Name und Property-Wert-Felder.
