import { setIcon } from 'obsidian';
import { fill, strings } from '../../../i18n/locale';

export interface MatchRow {
  name: string;
  from: string;
  /** Null when the destination does not resolve for this note. */
  to: string | null;
  /** Destination as typed, shown when it does not resolve for this note. */
  destination: string;
}

export interface MatchListState {
  count: number;
  rows: MatchRow[];
  /** Set while a condition is missing a type or value: the sentence saying what to add. */
  incomplete: string | null;
}

/** "N notes match now" with the first matches and a link to the preview. */
export function renderMatchList(
  parent: HTMLElement,
  options: { onOpenPreview?: () => void }
): { update: (state: MatchListState) => void; showLoading: () => void } {
  const root = parent.createDiv();
  // Height of the loading placeholder: the list never gets shorter than this.
  let reservedHeight = 0;
  // Placeholder rows at the height of the real list, so the modal does not jump.
  const showLoading = () => {
    root.empty();
    root.createDiv({ cls: 'advancedNoteMover-match-head' }).createSpan({
      cls: 'advancedNoteMover-section-title',
      text: strings().modals.ruleEditorMatchesHeading,
    });
    const card = root.createDiv({
      cls: 'advancedNoteMover-card advancedNoteMover-match-loading',
      attr: { 'aria-busy': 'true', 'aria-hidden': 'true' },
    });
    for (let i = 0; i < 3; i++) {
      card
        .createDiv({ cls: 'advancedNoteMover-match-row' })
        .createDiv({ cls: 'advancedNoteMover-match-skeleton' });
    }
    reservedHeight = Math.max(reservedHeight, root.offsetHeight);
  };
  const update = (state: MatchListState) => {
    const text = strings().modals;
    root.empty();
    root.setCssProps({ 'min-height': `${reservedHeight}px` });
    const head = root.createDiv({ cls: 'advancedNoteMover-match-head' });
    if (state.incomplete !== null) {
      head.createSpan({
        cls: 'advancedNoteMover-section-title',
        text: text.ruleEditorMatchesHeading,
      });
      root.createDiv({ cls: 'advancedNoteMover-card' }).createDiv({
        cls: 'advancedNoteMover-match-empty',
        text: state.incomplete,
      });
      return;
    }
    head.createSpan({
      cls: 'advancedNoteMover-section-title',
      text:
        state.count === 0
          ? text.ruleEditorMatchesNone
          : state.count === 1
            ? fill(text.ruleEditorMatchesOne, { count: 1 })
            : fill(text.ruleEditorMatchesMany, { count: state.count }),
    });
    const openPreview = state.count > 0 ? options.onOpenPreview : undefined;
    if (openPreview) {
      head
        .createEl('button', {
          cls: 'advancedNoteMover-link-button advancedNoteMover-phone-hidden',
          text: text.ruleEditorOpenPreview,
          attr: { type: 'button' },
        })
        .addEventListener('click', openPreview);
    }
    const card = root.createDiv({ cls: 'advancedNoteMover-card' });
    for (const row of state.rows) {
      const item = card.createDiv({ cls: 'advancedNoteMover-match-row' });
      setIcon(item.createSpan({ cls: 'advancedNoteMover-match-icon' }), 'file');
      item.createSpan({ cls: 'advancedNoteMover-match-name', text: row.name });
      const path = item.createSpan({ cls: 'advancedNoteMover-path' });
      path.createSpan({
        cls: 'advancedNoteMover-match-from',
        text:
          row.from === '/'
            ? text.previewFromRoot
            : fill(text.previewFrom, { folder: row.from }),
      });
      path.createSpan({
        cls: 'advancedNoteMover-match-to',
        text: row.from,
      });
      setIcon(
        path.createSpan({ cls: 'advancedNoteMover-match-to' }),
        'arrow-right'
      );
      path.createEl('b', {
        cls: 'advancedNoteMover-match-to',
        text: row.to ?? row.destination,
      });
    }
    if (openPreview) {
      const link = card.createEl('button', {
        cls: 'advancedNoteMover-phone-only advancedNoteMover-nav-link',
        attr: { type: 'button' },
      });
      link.createSpan({ text: text.ruleEditorShowAllInPreview });
      setIcon(link.createSpan(), 'chevron-right');
      link.addEventListener('click', openPreview);
    }
  };
  return { update, showLoading };
}
