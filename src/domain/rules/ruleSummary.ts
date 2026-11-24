import type { RuleV2, Trigger } from '../../types/RuleV2';

export type SummarySegment =
  | { kind: 'icon'; icon: string }
  | { kind: 'text' | 'value' | 'joiner' | 'token'; text: string }
  | { kind: 'arrow' };

export interface SummaryLabels {
  name: string;
  folder: string;
  created: string;
  modified: string;
  extension: string;
  links: string;
  embeds: string;
  heading: string;
  and: string;
  or: string;
  andNot: string;
  noCondition: string;
  noDestination: string;
}

const ICONS: Record<Trigger['criteriaType'], string> = {
  tag: 'tag',
  properties: 'text',
  fileName: 'file',
  extension: 'file',
  folder: 'folder',
  created_at: 'calendar',
  modified_at: 'calendar',
  links: 'link',
  embeds: 'link',
  headings: 'hash',
};

/** "includes item" reads as "includes" in a sentence. */
export function plainOperator(operator: string): string {
  return operator.replace(/ item$/, '');
}

function typeLabel(trigger: Trigger, labels: SummaryLabels): string {
  switch (trigger.criteriaType) {
    case 'fileName':
      return labels.name;
    case 'folder':
      return labels.folder;
    case 'created_at':
      return labels.created;
    case 'modified_at':
      return labels.modified;
    case 'extension':
      return labels.extension;
    case 'links':
      return labels.links;
    case 'embeds':
      return labels.embeds;
    case 'headings':
      return labels.heading;
    default:
      return '';
  }
}

function conditionSegments(
  trigger: Trigger,
  labels: SummaryLabels
): SummarySegment[] {
  const segments: SummarySegment[] = [
    { kind: 'icon', icon: ICONS[trigger.criteriaType] ?? 'text' },
  ];
  const value = trigger.value.trim();
  if (trigger.criteriaType === 'tag') {
    const tag = value && !value.startsWith('#') ? `#${value}` : value;
    if (trigger.operator !== 'includes item') {
      segments.push({ kind: 'text', text: plainOperator(trigger.operator) });
    }
    if (tag) segments.push({ kind: 'value', text: tag });
    return segments;
  }
  const lead =
    trigger.criteriaType === 'properties'
      ? (trigger.propertyName ?? '')
      : typeLabel(trigger, labels);
  if (lead) {
    segments.push(
      trigger.criteriaType === 'properties'
        ? { kind: 'value', text: lead }
        : { kind: 'text', text: lead }
    );
  }
  segments.push({ kind: 'text', text: plainOperator(trigger.operator) });
  if (value) segments.push({ kind: 'value', text: value });
  return segments;
}

function destinationSegments(
  destination: string,
  labels: SummaryLabels
): SummarySegment[] {
  const trimmed = destination.trim();
  if (!trimmed) return [{ kind: 'text', text: labels.noDestination }];
  return trimmed
    .split(/(\{\{[^}]*\}\})/)
    .filter(Boolean)
    .map(part =>
      part.startsWith('{{')
        ? { kind: 'token', text: part }
        : { kind: 'value', text: part }
    );
}

/** Conditions joined per match mode, an arrow, then the destination. */
export function buildRuleSummary(
  rule: RuleV2,
  labels: SummaryLabels
): SummarySegment[] {
  const joiner =
    rule.aggregation === 'any'
      ? labels.or
      : rule.aggregation === 'none'
        ? labels.andNot
        : labels.and;
  const segments: SummarySegment[] = [];
  if (rule.triggers.length === 0) {
    segments.push({ kind: 'text', text: labels.noCondition });
  }
  rule.triggers.forEach((trigger, index) => {
    if (index > 0) segments.push({ kind: 'joiner', text: joiner });
    segments.push(...conditionSegments(trigger, labels));
  });
  segments.push({ kind: 'arrow' });
  segments.push(...destinationSegments(rule.destination, labels));
  return segments;
}

/** Plain text of a summary, used for the list filter. */
export function summaryText(segments: SummarySegment[]): string {
  return segments
    .map(segment => ('text' in segment ? segment.text : ''))
    .filter(Boolean)
    .join(' ');
}
