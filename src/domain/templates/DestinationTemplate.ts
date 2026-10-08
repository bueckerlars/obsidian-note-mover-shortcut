import type { DatePlaceholderComponent } from '../dates/property-date';
import {
  formatDateComponent,
  formatDatePattern,
  isDateFormatPattern,
  isDatePlaceholderComponent,
  parsePropertyDateValue,
} from '../dates/property-date';
import {
  parsePropertyPlaceholderKey,
  resolvePropertyPlaceholder,
} from './property-placeholder';

export type FileTimestampField = 'created' | 'modified';

export type TemplateSegment =
  | {
      kind: 'text';
      value: string;
    }
  | {
      kind: 'placeholder';
      raw: string;
      type: 'tag';
      key: string;
    }
  | {
      kind: 'placeholder';
      raw: string;
      type: 'property';
      key: string;
      dateComponent?: DatePlaceholderComponent;
      dateFormat?: string;
    }
  | {
      kind: 'placeholder';
      raw: string;
      type: 'file';
      field: FileTimestampField | null;
      dateComponent?: DatePlaceholderComponent;
      dateFormat?: string;
    };

export interface TemplateParseError {
  message: string;
  index: number;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface DestinationTemplateContext {
  tags: string[];
  /**
   * Frontmatter / properties object as returned by MetadataExtractor.
   */
  properties: Record<string, unknown>;
  /**
   * Filesystem creation time (`TFile.stat.ctime`), when available.
   */
  createdAt?: Date | null;
  /**
   * Filesystem modification time (`TFile.stat.mtime`), when available.
   */
  updatedAt?: Date | null;
}

const PLACEHOLDER_START = '{{';
const PLACEHOLDER_END = '}}';

/**
 * Parse a destination template string into segments.
 *
 * Supported placeholder formats:
 * - {{tag.<tagValue>}}
 * - {{property.<propertyKey>}}
 * - {{property.<propertyKey>.<dateComponent>}}
 * - {{property.<propertyKey>.<dateFormat>}}
 * - {{property.<propertyKey>:<dateFormat>}}
 * - {{file.created}} / {{file.modified}} (ISO date)
 * - {{file.created.<dateComponent|dateFormat>}} / {{file.created:<dateFormat>}}
 * - Aliases: createdAt/created_at → created; modified_at/updated/updatedAt → modified
 *
 * Everything else is treated as plain text.
 */
export function parseDestinationTemplate(raw: string): {
  segments: TemplateSegment[];
  error?: TemplateParseError;
} {
  const segments: TemplateSegment[] = [];

  if (!raw) {
    return { segments: [] };
  }

  let index = 0;

  while (index < raw.length) {
    const start = raw.indexOf(PLACEHOLDER_START, index);

    if (start === -1) {
      // No more placeholders – rest is text
      if (index < raw.length) {
        segments.push({
          kind: 'text',
          value: raw.substring(index),
        });
      }
      break;
    }

    // Text before placeholder
    if (start > index) {
      segments.push({
        kind: 'text',
        value: raw.substring(index, start),
      });
    }

    const end = raw.indexOf(PLACEHOLDER_END, start + PLACEHOLDER_START.length);
    if (end === -1) {
      return {
        segments,
        error: {
          message: "Unclosed placeholder '{{' in destination template",
          index: start,
        },
      };
    }

    const inner = raw.substring(start + PLACEHOLDER_START.length, end).trim();

    if (inner.length === 0) {
      return {
        segments,
        error: {
          message: 'Empty placeholder {{}} is not allowed',
          index: start,
        },
      };
    }

    const [prefix, ...rest] = inner.split('.');
    const key = rest.join('.').trim();

    if (!key) {
      return {
        segments,
        error: {
          message:
            "Invalid placeholder format. Expected 'tag.<value>', 'property.<key>', or 'file.<key>'",
          index: start,
        },
      };
    }

    if (prefix !== 'tag' && prefix !== 'property' && prefix !== 'file') {
      return {
        segments,
        error: {
          message:
            "Unknown placeholder type. Supported types are 'tag', 'property', and 'file'.",
          index: start,
        },
      };
    }

    if (prefix === 'tag') {
      segments.push({
        kind: 'placeholder',
        raw: inner,
        type: 'tag',
        key,
      });
    } else if (prefix === 'property') {
      const parsedProperty = parsePropertyPlaceholderKey(key);
      segments.push({
        kind: 'placeholder',
        raw: inner,
        type: 'property',
        key: parsedProperty.lookupKey,
        dateComponent: parsedProperty.dateComponent,
        dateFormat: parsedProperty.dateFormat,
      });
    } else {
      const parsedFile = parseFilePlaceholderKey(key);
      segments.push({
        kind: 'placeholder',
        raw: inner,
        type: 'file',
        field: parsedFile.field,
        dateComponent: parsedFile.dateComponent,
        dateFormat: parsedFile.dateFormat,
      });
    }

    index = end + PLACEHOLDER_END.length;
  }

  return { segments };
}

export function validateDestinationTemplate(
  raw: string
): TemplateValidationResult {
  const errors: string[] = [];

  // Plain destination is always valid
  if (
    !raw ||
    (!raw.includes(PLACEHOLDER_START) && !raw.includes(PLACEHOLDER_END))
  ) {
    return {
      isValid: true,
      errors,
    };
  }

  const { error } = parseDestinationTemplate(raw);

  if (error) {
    errors.push(error.message);
    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    errors,
  };
}

/**
 * Render a destination template using the provided context.
 *
 * Behaviour:
 * - Unknown or non-resolvable placeholders are replaced with an empty string.
 * - Tag placeholders:
 *   - {{tag.some/path}} → if a tag exactly equals '#some/path', the inner path 'some/path'
 *     is used as-is.
 *   - If no matching tag exists, the placeholder becomes an empty string.
 * - Property placeholders:
 *   - {{property.status}} → stringified value of properties['status'].
 *   - {{property.created.year}} → date component from properties['created'] when parseable.
 *   - {{property.created.YYYY-MM-DD}} / {{property.created:YYYY.MM.DD}} → Moment-style format.
 *   - Literal property keys take precedence over date components (e.g. property created.year).
 *   - If the property is missing or empty, the placeholder becomes an empty string.
 * - File placeholders:
 *   - {{file.created}} / {{file.modified}} → local ISO calendar date (YYYY-MM-DD).
 *   - {{file.created.year}} / {{file.modified.DD-MM-YYYY}} → same components/formats as properties.
 *   - Uses filesystem ctime/mtime from context.createdAt / context.updatedAt.
 *   - Missing timestamps become an empty string.
 */
export function renderDestinationTemplate(
  raw: string,
  context: DestinationTemplateContext
): string {
  if (!raw) {
    return '';
  }

  const { segments, error } = parseDestinationTemplate(raw);

  // If the template is syntactically invalid, bubble up an error so that
  // callers (e.g. RuleManagerV2.resolveDestinationTemplate) can safely fall
  // back to the raw destination string instead of using a truncated path.
  if (error) {
    throw new Error(error.message);
  }

  if (segments.length === 0) {
    return '';
  }

  let result = '';

  for (const segment of segments) {
    if (segment.kind === 'text') {
      result += segment.value;
      continue;
    }

    if (segment.type === 'tag') {
      result += resolveTagPlaceholder(segment.key, context.tags);
    } else if (segment.type === 'property') {
      result += resolvePropertyPlaceholder(
        propertyPlaceholderKey(segment),
        context.properties
      );
    } else if (segment.type === 'file') {
      result += resolveFilePlaceholder(segment, context);
    }
  }

  return result;
}

function propertyPlaceholderKey(
  segment: Extract<TemplateSegment, { type: 'property' }>
): string {
  const propertyPrefix = 'property.';
  if (segment.raw.startsWith(propertyPrefix)) {
    return segment.raw.slice(propertyPrefix.length);
  }

  if (segment.dateComponent) {
    return `${segment.key}.${segment.dateComponent}`;
  }
  if (segment.dateFormat) {
    return segment.dateFormat.includes('.')
      ? `${segment.key}:${segment.dateFormat}`
      : `${segment.key}.${segment.dateFormat}`;
  }
  return segment.key;
}

function normalizeFileTimestampField(key: string): FileTimestampField | null {
  switch (key) {
    case 'created':
    case 'createdAt':
    case 'created_at':
      return 'created';
    case 'modified':
    case 'modified_at':
    case 'updated':
    case 'updatedAt':
      return 'modified';
    default:
      return null;
  }
}

interface ParsedFilePlaceholderKey {
  field: FileTimestampField | null;
  dateComponent?: DatePlaceholderComponent;
  dateFormat?: string;
}

function parseFilePlaceholderKey(key: string): ParsedFilePlaceholderKey {
  const trimmed = key.trim();
  if (!trimmed) {
    return { field: null };
  }

  const colonIndex = trimmed.indexOf(':');
  if (colonIndex > 0 && colonIndex < trimmed.length - 1) {
    const fieldKey = trimmed.substring(0, colonIndex);
    const dateFormat = trimmed.substring(colonIndex + 1).trim();
    const field = normalizeFileTimestampField(fieldKey);
    if (field && isDateFormatPattern(dateFormat)) {
      return { field, dateFormat };
    }
  }

  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot > 0 && lastDot < trimmed.length - 1) {
    const fieldKey = trimmed.substring(0, lastDot);
    const suffix = trimmed.substring(lastDot + 1).trim();
    const field = normalizeFileTimestampField(fieldKey);

    if (field) {
      if (isDatePlaceholderComponent(suffix)) {
        return { field, dateComponent: suffix };
      }
      if (isDateFormatPattern(suffix)) {
        return { field, dateFormat: suffix };
      }
    }
  }

  return { field: normalizeFileTimestampField(trimmed) };
}

function resolveFilePlaceholder(
  segment: Extract<TemplateSegment, { type: 'file' }>,
  context: DestinationTemplateContext
): string {
  if (!segment.field) {
    return '';
  }

  const rawDate =
    segment.field === 'created' ? context.createdAt : context.updatedAt;

  if (rawDate === null || rawDate === undefined) {
    return '';
  }

  const parsedDate = parsePropertyDateValue(rawDate);
  if (!parsedDate) {
    return '';
  }

  if (segment.dateComponent) {
    return formatDateComponent(parsedDate, segment.dateComponent);
  }

  if (segment.dateFormat) {
    return formatDatePattern(parsedDate, segment.dateFormat);
  }

  // Bare {{file.created}} / {{file.modified}} → ISO calendar date
  return formatDateComponent(parsedDate, 'iso');
}

function resolveTagPlaceholder(key: string, tags: string[]): string {
  if (!Array.isArray(tags) || tags.length === 0) {
    return '';
  }

  const normalizedKey = key.startsWith('#')
    ? key.toLowerCase()
    : `#${key.toLowerCase()}`;

  // 1. Exact match (current behaviour)
  const exactMatch = tags.find(tag => tag.toLowerCase() === normalizedKey);
  if (exactMatch) {
    return stripTagHash(exactMatch);
  }

  // 2. Prefix match: use the most specific tag that starts with the full key
  const candidates = tags.filter(tag => {
    const lower = tag.toLowerCase();
    return lower === normalizedKey || lower.startsWith(normalizedKey + '/');
  });

  if (candidates.length === 0) {
    return '';
  }

  const bestMatch = candidates.reduce((currentBest, candidate) => {
    return candidate.length > currentBest.length ? candidate : currentBest;
  });

  return stripTagHash(bestMatch);
}

function stripTagHash(tag: string): string {
  return tag.startsWith('#') ? tag.substring(1) : tag;
}
