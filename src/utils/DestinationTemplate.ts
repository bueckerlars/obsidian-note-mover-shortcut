export type TemplateSegment =
  | {
      kind: 'text';
      value: string;
    }
  | {
      kind: 'placeholder';
      raw: string;
      type: 'tag' | 'property';
      key: string;
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
  properties: Record<string, any>;
}

const PLACEHOLDER_START = '{{';
const PLACEHOLDER_END = '}}';

/**
 * Parse a destination template string into segments.
 *
 * Supported placeholder formats:
 * - {{tag.<tagValue>}}
 * - {{property.<propertyKey>}}
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
            "Invalid placeholder format. Expected 'tag.<value>' or 'property.<key>'",
          index: start,
        },
      };
    }

    if (prefix !== 'tag' && prefix !== 'property') {
      return {
        segments,
        error: {
          message:
            "Unknown placeholder type. Supported types are 'tag' and 'property'.",
          index: start,
        },
      };
    }

    segments.push({
      kind: 'placeholder',
      raw: inner,
      type: prefix,
      key,
    });

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
 *   - If the property is missing or empty, the placeholder becomes an empty string.
 */
export function renderDestinationTemplate(
  raw: string,
  context: DestinationTemplateContext
): string {
  if (!raw) {
    return '';
  }

  const { segments } = parseDestinationTemplate(raw);

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
      result += resolvePropertyPlaceholder(segment.key, context.properties);
    }
  }

  return result;
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

function resolvePropertyPlaceholder(
  key: string,
  properties: Record<string, any>
): string {
  if (!properties || typeof properties !== 'object') {
    return '';
  }

  if (!Object.prototype.hasOwnProperty.call(properties, key)) {
    return '';
  }

  const value = properties[key];

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  // Basic handling for lists and other types: stringify
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value);
}
