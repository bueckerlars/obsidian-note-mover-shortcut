import { stringifyUnknown } from '../../utils/stringify-unknown';
import { renderDestinationTemplate } from './DestinationTemplate';

export interface PlaceholderOption {
  /** Placeholder with braces, for example `{{file.created.year}}`. */
  token: string;
  /** What it gives for the sample note. */
  example: string;
}

const CREATED_COMPONENTS = ['year', 'month', 'day'] as const;
const MAX_PROPERTIES = 8;
const MAX_EXAMPLE_LENGTH = 24;

/** Date placeholders with the sample note's created date, or today. */
export function createdPlaceholders(
  createdAt: Date | null | undefined,
  now: Date = new Date()
): PlaceholderOption[] {
  return CREATED_COMPONENTS.map(component => {
    const token = `{{file.created.${component}}}`;
    return {
      token,
      example: renderDestinationTemplate(token, {
        tags: [],
        properties: {},
        createdAt: createdAt ?? now,
      }),
    };
  });
}

/** One placeholder per property key in the vault, with a sample value. */
export function propertyPlaceholders(
  samples: ReadonlyMap<string, readonly unknown[]>
): PlaceholderOption[] {
  return [...samples.keys()]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, MAX_PROPERTIES)
    .map(key => {
      const value = stringifyUnknown(
        samples.get(key)?.find(item => item !== '' && item != null) ?? ''
      );
      return {
        token: `{{property.${key}}}`,
        example:
          value.length > MAX_EXAMPLE_LENGTH
            ? `${value.slice(0, MAX_EXAMPLE_LENGTH - 1)}…`
            : value,
      };
    });
}
