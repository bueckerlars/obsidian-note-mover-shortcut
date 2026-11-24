import { parseDestinationTemplate } from './DestinationTemplate';

export interface PlaceholderProblem {
  /** The text as typed, for example `{{year}}`. */
  token: string;
  /** Nearest valid placeholder with braces, or null when nothing is close. */
  suggestion: string | null;
}

const BARE_CANDIDATES = [
  'file.created.year',
  'file.created.month',
  'file.created.day',
  'file.created',
  'file.modified.year',
  'file.modified.month',
  'file.modified.day',
  'file.modified',
];

const RESERVED = new Set(['tag', 'property', 'file']);
const MAX_TYPO_DISTANCE = 3;

function isKnownPlaceholder(inner: string): boolean {
  if (!inner) return false;
  const { segments, error } = parseDestinationTemplate(`{{${inner}}}`);
  if (error) return false;
  const segment = segments[0];
  return !(
    segment?.kind === 'placeholder' &&
    segment.type === 'file' &&
    segment.field === null
  );
}

function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        previous[j] + 1,
        row[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = row;
  }
  return previous[b.length];
}

/** Nearest valid placeholder for something that is not one, with braces. */
export function suggestPlaceholder(inner: string): string | null {
  const text = inner.trim().toLowerCase();
  const tail = text.split('.').pop() ?? '';
  if (!tail || RESERVED.has(tail)) return null;
  const byTail = BARE_CANDIDATES.find(
    candidate => candidate.split('.').pop() === tail
  );
  if (byTail) return `{{${byTail}}}`;
  let best: string | null = null;
  let bestDistance = MAX_TYPO_DISTANCE + 1;
  for (const candidate of BARE_CANDIDATES) {
    const d = distance(text, candidate);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  if (best) return `{{${best}}}`;
  return /^[\w-]+$/.test(inner.trim()) ? `{{property.${inner.trim()}}}` : null;
}

/** Placeholders in a destination that the mover would not resolve. */
export function findPlaceholderProblems(
  template: string
): PlaceholderProblem[] {
  const problems: PlaceholderProblem[] = [];
  const rest = template.replace(/\{\{([^{}]*)\}\}/g, (token, inner: string) => {
    if (!isKnownPlaceholder(inner.trim())) {
      problems.push({ token, suggestion: suggestPlaceholder(inner) });
    }
    return '';
  });
  const open = rest.indexOf('{{');
  if (open !== -1) {
    problems.push({ token: rest.slice(open), suggestion: null });
  }
  return problems;
}
