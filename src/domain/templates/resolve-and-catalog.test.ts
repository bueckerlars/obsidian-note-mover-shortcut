import { describe, expect, it } from 'vitest';
import {
  createdPlaceholders,
  propertyPlaceholders,
} from './placeholderCatalog';
import { resolveDestinationPreview } from './resolveDestinationPreview';

const note = {
  tags: ['#work'],
  properties: { status: 'done' },
  createdAt: new Date(2026, 10, 21, 12),
  updatedAt: null,
};

describe('resolveDestinationPreview', () => {
  it('resolves placeholders for a note', () => {
    expect(resolveDestinationPreview('Work/{{file.created.year}}/', note)).toBe(
      'Work/2026'
    );
    expect(resolveDestinationPreview('{{property.status}}', note)).toBe('done');
  });

  it('returns null for empty or broken destinations', () => {
    expect(resolveDestinationPreview('  ', note)).toBeNull();
    expect(resolveDestinationPreview('Work/{{', note)).toBeNull();
    expect(resolveDestinationPreview('{{property.missing}}', note)).toBeNull();
  });
});

describe('placeholder catalog', () => {
  it('shows the created date of the sample note', () => {
    expect(createdPlaceholders(note.createdAt)).toEqual([
      { token: '{{file.created.year}}', example: '2026' },
      { token: '{{file.created.month}}', example: '11' },
      { token: '{{file.created.day}}', example: '21' },
    ]);
  });

  it('lists property keys sorted with the first non-empty sample', () => {
    const samples = new Map<string, unknown[]>([
      ['status', ['', 'done']],
      ['project', ['Apollo']],
    ]);
    expect(propertyPlaceholders(samples)).toEqual([
      { token: '{{property.project}}', example: 'Apollo' },
      { token: '{{property.status}}', example: 'done' },
    ]);
  });
});
