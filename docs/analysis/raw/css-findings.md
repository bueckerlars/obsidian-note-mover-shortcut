# CSS-Analyse: styles.css (Advanced Note Mover)

Geprueft: `styles.css` (2878 Zeilen) gegen den aktuellen Obsidian-Standard, Abgleich der Klassennamen mit `src/**` und `main.ts`.
Methode: vollstaendiges Lesen der Datei, Zaehlung per grep, Pruefung aller 227 Selektor-Klassen (`advancedNoteMover-*`, `note-mover-*`) per Literal-Suche in `src/` und `main.ts`, Einzelpruefung der Treffer, die nur ueber Konstanten oder Templates gebaut werden.
Es wurde keine Datei ausser diesem Bericht geaendert.

## Statistik

| Kennzahl                           | Wert      | Anmerkung                                                                                                       |
| ---------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| `!important`                       | 0         | gut                                                                                                             |
| Hex-Farben (`#xxx`)                | 0         | gut                                                                                                             |
| `rgb()`/`rgba()`                   | 1         | Zeile 689 (Box-Shadow). Dazu `background-color: white` in Zeile 1227 und 1358, beide in totem Code              |
| px-Vorkommen gesamt                | 458       | davon `font-size: px` in 17 Zeilen, `border-radius: px` in 34 Zeilen, `padding/margin/gap` mit px in 235 Zeilen |
| `em`-Schriftgroessen (`font-size`) | 75 Zeilen | keine Obsidian-Schrift-Variablen                                                                                |
| `var(--...)`-Nutzung               | 266       | Groessenteil ist sauber tokenisiert                                                                             |
| `@media`-Regeln                    | 4         | Zeilen 1652 (max-width 768), 2009 (max-width 480), 2478 (max-height 800 + portrait), 2846 (max-height 500)      |
| `@container`                       | 1         | Zeile 2854 (gut fuer Modal-Layout)                                                                              |
| `body.is-mobile`-Regeln            | 8         | Zeilen 1089, 2110, 2121, 2135, 2263, 2341, 2434, 2479                                                           |
| `.is-mobile` ohne `body.`          | 55 Zeilen | siehe CSS-10                                                                                                    |
| `[class*=...]`-Selektoren          | 3         | Zeilen 1734, 1741, 2098 (siehe CSS-03)                                                                          |
| `transition: all`                  | 3         | Zeilen 843, 919, 1540                                                                                           |
| `-webkit-overflow-scrolling`       | 3         | Zeilen 1092, 2130, 2540                                                                                         |
| Selektor-Klassen gesamt            | 227       | davon 46 ohne Treffer in `src/` (nach Pruefung echt tot, siehe Abschnitt TS-Abgleich)                           |

Positiv: Keine globalen Ueberschreibungen von Obsidian-Kernklassen (`.setting-item`, `.modal`, `.checkbox-container`, `.vertical-tab-content`, `.clickable-icon`, `.dropdown`, `.mod-warning`). Alle stehen hinter einem Plugin-Prefix oder einem Plugin-Container. Die Ausnahme ist `[class*='noteMover']`, siehe CSS-03.

## Findings

### CSS-01 | Schweregrad: mittel | styles.css:229-243, 169-197, 302-308, 466-480, 523-552, 1101-1371, 1380-1413, 1438-1462, 1520-1628, 2416-2431

**Beschreibung:** Grob 460 bis 480 Zeilen (ca. 16 % der Datei) sind toter CSS. Die Selektoren zielen auf Klassen, die in `src/` nie gesetzt werden. Das betrifft u.a. die V1-Mobile-Bloecke (`mobile-setting-*`, `mobile-section-*`, `mobile-rule-card/header/name/toggle/item/controls`, `mobile-toggle-*`, `mobile-filter-card`, `mobile-input-setting`, `mobile-button-setting`), die Retention-Inline-Selektoren, `modal-info-box/row`, `preview-item-blocked/block-reason/blocking-filter`, `preview-section-blocked`, `block-reason-label`, `filter-label`, `note-mover-history-title`, `update-modal-footer-mobile`, `mobile-stack/center/full-width`, `mobile-move-buttons-container`, `mobile-move-button-hidden`.

**Beleg:**

```css
.advancedNoteMover-settings-root
  .setting-item
  .setting-item-control
  input.advancedNoteMover-retention-value-input {   /* Zeile 230-233: Klasse existiert in src nicht */
```

```css
.advancedNoteMover-mobile-toggle-slider { ... }    /* Zeile 1209: nur in toten Toggle-Bloecken */
```

**Fix:** Die Bloecke loeschen. Vorher pro Block `grep -rn "<klasse>" src main.ts` wiederholen. Nicht loeschen: alle `advancedNoteMover-rule-mobile-*`-Klassen (siehe TS-Abgleich, Fehlalarm), `advancedNoteMover-mobile-rule-actions` (1373-1378, wird in RulesSettingsSection.ts:188 genutzt) und `advancedNoteMover-mobile-toggle-control` (1484-1492, wird in PeriodicMovementSettingsSection.ts genutzt).

### CSS-02 | Schweregrad: hoch | styles.css:1652-1656, 1798-1814, 1830-1862, 1958-2005, 2009-2105

**Beschreibung:** Die Mobile-Anpassungen laufen ueber reine Viewport-Breakpoints (`@media (max-width: 768px)` bzw. `480px`), nicht ueber `body.is-mobile`. Sie greifen damit auch auf Desktop-Fenstern unter 768 px Breite (Split-Ansicht, schmales Fenster). Dort bekommen Modals `width: 100vw`, Buttons 44 px Mindesthoehe und gestapelte Footer. Die Vorgabe lautet "Mobile via body.is-mobile statt/zusaetzlich zu @media".

**Beleg:**

```css
@media (max-width: 768px) {
  /* Modal Size Adjustments */
  .modal-container.advancedNoteMover-modal-size-small,
  ...
    width: 100vw;
    max-width: 95vw;
```

**Fix:** Die Modal-Breite (1654-1660) und die Footer-/Button-Regeln in `body.is-mobile` ueberfuehren. `@media` nur dort behalten, wo ein reines Fensterformat gewollt ist. Die 480-px-Bloecke (2009-2105) auf `body.is-mobile` umstellen oder mit Kommentar begruenden.

### CSS-03 | Schweregrad: hoch | styles.css:1734-1745, 2098-2104

**Beschreibung:** Die Selektoren `[class*='noteMover']` matchen jede Klasse, die den Teilstring "noteMover" enthaelt. Das trifft auch alte Praefix-Reste und Fremdklassen. Dort werden globale Regeln fuer `.setting-item-control button` und `button` gesetzt. Das ist ein Ueberschreiben ausserhalb des Plugin-Scopes und fragil.

**Beleg:**

```css
[class*='noteMover'] .setting-item-control button {
    min-width: 44px;
    min-height: 44px;
    padding: 8px;
}
[class*='noteMover'] button,
```

**Fix:** Durch explizite Plugin-Container ersetzen, zum Beispiel `.advancedNoteMover-settings-root .setting-item-control button`, `.advancedNoteMover-modal-button-container button` und die vorhandenen `.note-mover-*-modal button`-Selektoren. Die `[class*=...]`-Selektoren komplett entfernen.

### CSS-04 | Schweregrad: mittel | styles.css:1668-1679, 2011-2021, 2461-2470, 2485-2493

**Beschreibung:** Titel und Untertitel der Modals werden in vier Bloecken mit gleicher Spezifitaet ueberschrieben (768, 480, `is-mobile`, portrait). Welcher Wert gilt, haengt nur von der Reihenfolge ab. Auf einem Phone im Hochformat unter 480 px gewinnt der Eintrag aus 2485.

**Beleg:**

```css
.advancedNoteMover-modal-title {
  font-size: 1.2em;
} /* 2011 (480) */
... .is-mobile .advancedNoteMover-modal-title {
  font-size: 1.3em;
  margin-bottom: 12px;
} /* 2461 */
... .is-mobile .advancedNoteMover-modal-title {
  font-size: 1.2em;
  margin-bottom: 8px;
} /* 2485 */
```

**Fix:** Eine Skala pro Zustand definieren, zum Beispiel `body.is-mobile { --anm-modal-title-size: ... }`, oder die Regeln in einen Block pro Zustand konsolidieren. Die 768- und 480-Eintraege fuer Titel und Untertitel streichen.

### CSS-05 | Schweregrad: mittel | styles.css:2646-2648

**Beschreibung:** Die Segment-Buttons des Mobile-Rule-Editors (All/Any/None) sind nur 40 px hoch. Die Vorgabe lautet Touch-Ziele >= 44 px.

**Beleg:**

```css
.advancedNoteMover-rule-mobile .advancedNoteMover-rule-mobile-segment {
  min-height: calc(var(--anm-rule-mobile-touch) - 4px);
```

**Fix:** `min-height: var(--anm-rule-mobile-touch);`. Der Container (2636) hat bereits 4 px Padding, daher passt die Gesamthoehe.

### CSS-06 | Schweregrad: mittel | styles.css:689

**Beschreibung:** Ein fester `rgba(0,0,0,0.15)`-Schatten passt nicht zu Dark Mode und fremden Themes. Obsidian stellt Schatten-Variablen bereit.

**Beleg:**

```css
.setting-item.advancedNoteMover-dragging {
  ...
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
```

**Fix:** `box-shadow: var(--shadow-l);` (oder `--shadow-s`, je nach gewuenschter Staerke). Den Variablennamen gegen die aktuelle Obsidian-Version pruefen.

### CSS-07 | Schweregrad: mittel | styles.css:1550

**Beschreibung:** `--background-modifier-active` ist im Obsidian-Standard nicht sicher belegt. Ist die Variable nicht definiert, faellt der Hintergrund beim Druck auf den Button auf `transparent` zurueck. Die Pruefung ist nicht abschliessend moeglich, da kein Obsidian-Quelltext im Repo liegt.

**Beleg:**

```css
.advancedNoteMover-mobile-move-button:active {
  background: var(--background-modifier-active);
```

**Fix:** Gegen die Obsidian-Variablenliste pruefen. Wahrscheinlich ist `--background-modifier-active-hover` gemeint, sonst `--background-modifier-hover`.

### CSS-08 | Schweregrad: mittel | styles.css:18-23, 90-91, 129-139, 302, 1748-1771, 1895-1918, 2099-2101, 2135, 2263, 2341, 2872

**Beschreibung:** Drei Modals nutzen die Klassen `note-mover-preview-modal`, `note-mover-update-modal`, `note-mover-history-modal`. Das passt nicht zum Plugin-Prefix `advancedNoteMover-`, das alle anderen Modals verwenden (z.B. `advancedNoteMover-confirm-modal`). Dadurch entsteht Mischnaming, und die Klassen sind eine potenzielle Kollisionsquelle.

**Beleg:** `src/modals/PreviewModal.ts:36` `cssClass: 'note-mover-preview-modal'`, `src/modals/UpdateModal.ts:21` `cssClass: 'note-mover-update-modal'`, `src/modals/HistoryModal.ts:27` `cssClass: 'note-mover-history-modal'`.

**Fix:** In TS und CSS gemeinsam auf `advancedNoteMover-preview-modal` etc. umstellen. Hinweis: Bestehende Custom-CSS-Snippets, die diese Klassen nutzen, brechen dann. Im CHANGELOG (Rebranding) dokumentieren.

### CSS-09 | Schweregrad: niedrig | styles.css:2080-2090, 2357-2375

**Beschreibung:** Die Changelog-Regeln fuer Phones stehen zweimal. Bei `.advancedNoteMover-changelog-list` gilt 0.9em (480) gegen 0.95em (`is-mobile`), bei `section-title` 0.95em gegen 1em. Die 480-Werte sind damit auf Mobile wirkungslos.

**Fix:** Eine Quelle fuer Changelog-Typografie.

### CSS-10 | Schweregrad: niedrig | styles.css:1097-1099, 2139-2183, 2216-2260, 2306-2308, 2422-2431 (55 Zeilen insgesamt)

**Beschreibung:** Viele Mobile-Regeln beginnen mit `.is-mobile` statt `body.is-mobile`. Das funktioniert, weil Obsidian die Klasse nur auf `<body>` setzt. Die Konsistenz mit der Vorgabe fehlt, und jeder Element-Descendant mit dieser Klasse wuerde matchen.

**Beleg:** `.is-mobile .advancedNoteMover-history-entry-mobile {` (2152)

**Fix:** Alle `.is-mobile` durch `body.is-mobile` ersetzen (Suche-und-Ersetze, ohne Logikaenderung).

### CSS-11 | Schweregrad: niedrig | styles.css:1247, 1282, 1389, 1430, 1442, 1627, 1648, 2148, 2197, 2242, 2337, 2407, 2430, 2457, 2601

**Beschreibung:** `font-size: 16px` ist eine bewusste Ausnahme gegen iOS-Zoom bei Inputs. Nur zwei Stellen (1504, 1517) haben den Kommentar. Die uebrigen 13 Stellen sind unbegruendet.

**Fix:** Kommentar `/* iOS: verhindert Zoom bei Fokus */` ergaenzen. Eine Obsidian-Variable existiert dafuer nicht, der Wert bleibt.

### CSS-12 | Schweregrad: niedrig | styles.css, 34 Stellen (z.B. 152, 213, 252, 265 usw.)

**Beschreibung:** `border-radius` ist 34-mal in px gesetzt, nur 6-mal ueber Variablen. Die Vorgabe lautet Obsidian-Radius-Variablen.

**Beleg:** `.advancedNoteMover-modal-list-item { ... border-radius: 6px; }` (152)

**Fix:** Auf `var(--radius-s)`, `var(--radius-m)`, `var(--radius-l)` mappen. Die Zuordnung je nach optischem Ergebnis festlegen.

### CSS-13 | Schweregrad: niedrig | styles.css, 75 Zeilen (z.B. 4, 181, 296, 1028, 1111)

**Beschreibung:** Schriftgroessen sind in `em` gesetzt statt ueber die Obsidian-Schriftskala.

**Beleg:** `.advancedNoteMover-modal-info-row { font-size: 0.9em; }` (181)

**Fix:** `var(--font-ui-smaller|small|medium|large)` nutzen, sofern die Groessen optisch passen. Die Skala ist die Standardbasis fuer Theme-Kompatibilitaet.

### CSS-14 | Schweregrad: niedrig | styles.css, 235 Zeilen mit px in padding/margin/gap

**Beschreibung:** Abstaende sind in px gesetzt. Obsidian stellt `--size-2-*` und `--size-4-*` bereit. Das Projekt nutzt die Variablen bereits im neuen Mobile-Rule-Editor (ab 2525), in den aelteren Bloecken aber nicht.

**Beleg:** `.advancedNoteMover-mobile-settings-container { padding: 8px; gap: 8px; }` (1079-1081)

**Fix:** Schrittweise auf `--size-*` umstellen, beginnend mit dem Mobile-Bereich. Touch-Groessen (44 px, 48 px) bleiben bewusst fest oder ueber `--anm-rule-mobile-touch`.

### CSS-15 | Schweregrad: niedrig | styles.css:843, 919, 1540

**Beschreibung:** `transition: all` animiert jede Eigenschaft, auch unbeabsichtigte (Layout-Shifts).

**Beleg:** `.advancedNoteMover-rule-aggregation-button { ... transition: all 0.2s ease; }` (843)

**Fix:** Explizite Eigenschaften, z.B. `transition: background-color 0.2s ease, border-color 0.2s ease;`.

### CSS-16 | Schweregrad: niedrig | styles.css:1092, 2130, 2540

**Beschreibung:** `-webkit-overflow-scrolling: touch` ist seit iOS 13 wirkungslos. `overflow-y: auto` reicht.

**Fix:** Die drei Zeilen entfernen.

### CSS-17 | Schweregrad: niedrig | styles.css:2115-2116

**Beschreibung:** Das Mobile-Modal nutzt `100vh`. Auf iOS ist `100vh` groesser als die sichtbare Flaeche (Adressleiste), das Modal ragt unter den Bildschirm.

**Beleg:**

```css
max-height: 100vh;
height: 100vh;
```

**Fix:** `height: 100vh; height: 100dvh;` (Fallback zuerst, dann dynamische Viewport-Hoehe).

### CSS-18 | Schweregrad: niedrig | styles.css:1227, 1358

**Beschreibung:** `background-color: white` ist hart kodiert. Im Dark Mode kollidiert es nicht zwingend, ist aber kein Token. Beide Stellen liegen in totem Code (CSS-01), beim Loeschen entfaellt das Problem.

**Fix:** Beim Loeschen erledigt. Falls der Toggle-Daumen benoetigt wird: Obsidian-Variable `--toggle-thumb-color` (gegen aktuelle Version pruefen) oder `var(--text-on-accent)`.

### CSS-19 | Schweregrad: niedrig | styles.css:1209-1240 vs. 1339-1371, 1243-1253 vs. 1501-1505, 1423-1436 vs. 1438-1448

**Beschreibung:** Drei Duplikat-Paare. Toggle-Slider/Knopf sind im V1-Block (1209-1240) und im Rule-Block (1339-1371) fast identisch. Text-Input steht zweimal, `mobile-dropdown` wiederholt die Retention-Regel. Die Varianten 1209-1240, 1243-1253 und 1438-1448 sind tot, nur 1501-1505 ist aktiv.

**Fix:** Beim Loeschen von CSS-01 erledigt. Danach eine Quelle pro Komponente behalten.

### CSS-20 | Schweregrad: niedrig | styles.css:663, 295, 503, 2737

**Beschreibung:** Sichtbare Texte und Icons werden ueber `opacity` gedimmt (Drag-Handle 0.6, Pfade 0.78). Das senkt den Kontrast, ohne Theme-Farben zu nutzen. `--text-faint` fuer den Connector ist ebenfalls sehr schwach.

**Beleg:** `.advancedNoteMover-drag-handle { opacity: 0.6; ... }` (658-662)

**Fix:** `color: var(--text-muted)` statt `opacity`. Kontrast nach dem Umbau pruefen (Icons mindestens 3:1).

## TS-Abgleich (Klassennamen)

Pruefung aller 227 Selektor-Klassen gegen `src/**` und `main.ts`.

**Echt ungenutzt (46 Klassen, Grundlage fuer CSS-01):**
`advancedNoteMover-block-reason-label`, `-filter-label`, `-mobile-button-setting`, `-mobile-center`, `-mobile-dropdown`, `-mobile-edit-btn`, `-mobile-filter-card`, `-mobile-filters-list-container`, `-mobile-full-width`, `-mobile-input-label`, `-mobile-input-setting`, `-mobile-move-button-hidden`, `-mobile-move-buttons-container`, `-mobile-rule-card`, `-mobile-rule-controls`, `-mobile-rule-header`, `-mobile-rule-item`, `-mobile-rule-name`, `-mobile-rule-toggle`, `-mobile-rules-list-container`, `-mobile-section-container`, `-mobile-section-description`, `-mobile-section-heading`, `-mobile-setting-card`, `-mobile-setting-control`, `-mobile-setting-description`, `-mobile-setting-header`, `-mobile-setting-title`, `-mobile-settings-container`, `-mobile-stack`, `-mobile-toggle-container`, `-mobile-toggle-input`, `-mobile-toggle-setting`, `-mobile-toggle-slider`, `-mobile-toggle-switch`, `-modal-info-box`, `-modal-info-row`, `-preview-item-block-reason`, `-preview-item-blocked`, `-preview-item-blocking-filter`, `-preview-section-blocked`, `-retention-unit-dropdown`, `-retention-value-input`, `-rule-rule-type`, `-update-modal-footer-mobile`, `note-mover-history-title`.

**Fehlalarm (nicht loeschen):** Alle `advancedNoteMover-rule-mobile-*` werden per Konstante `const CLS = 'advancedNoteMover-rule-mobile'` (`src/modals/rule-editor/RuleEditorMobileView.ts:42`) mit Template-Strings gebaut. Auch `advancedNoteMover-mobile-move-button` wird in `src/utils/MobileUtils.ts:82` gesetzt, `advancedNoteMover-rule-editor--mobile` in `RuleEditorModal.ts:66` ueber `mobileShellClass`.

**TS-Klassen ohne CSS-Regel (niedrig, nur Hinweis):**

- `advancedNoteMover-conflict-modal-message-mobile` (`ConflictModal.ts:57`)
- `advancedNoteMover-preview-path-target` (`PreviewModal.ts:134`), nur `advancedNoteMover-target-path` (511) existiert
- `advancedNoteMover-mobile-move-up-button` / `-down-button` (`MobileUtils.ts:82`), nur Basisklasse gestylt

## Hinweise und Grenzen

- Die Pruefung der Obsidian-Variablennamen erfolgte ohne Zugriff auf den Obsidian-Quelltext. Bei CSS-06, CSS-07 und CSS-18 die Namen gegen die installierte Obsidian-Version bestaetigen.
- Die Zeilenzahl toter CSS (CSS-01) ist eine Schaetzung aus den Bereichen, nicht exakt gezaehlt.
- Die Zuordnung in CSS-02 (viewport vs. `body.is-mobile`) betrifft das Verhalten auf schmalen Desktop-Fenstern. Ob dies gewollt ist, muss der Entwickler entscheiden.
- Nicht geprueft: visuelles Rendering in Light/Dark, Theme-Kompatibilitaet mit Drittthemes, sowie echte Geraete-Tests.
