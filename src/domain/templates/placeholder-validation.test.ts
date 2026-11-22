import { describe, expect, it } from 'vitest';
import {
  findPlaceholderProblems,
  suggestPlaceholder,
} from './placeholderValidation';

describe('findPlaceholderProblems', () => {
  it('accepts plain folders and every supported placeholder', () => {
    expect(findPlaceholderProblems('Work/Meetings')).toEqual([]);
    expect(
      findPlaceholderProblems(
        '{{tag.work}}/{{property.status}}/{{file.created.year}}/{{file.modified:YYYY-MM}}'
      )
    ).toEqual([]);
  });

  it('flags a bare word and suggests the nearest date placeholder', () => {
    expect(findPlaceholderProblems('Work/{{year}}')).toEqual([
      { token: '{{year}}', suggestion: '{{file.created.year}}' },
    ]);
  });

  it('flags unknown file keys and unknown types', () => {
    expect(findPlaceholderProblems('{{file.created.yeer}}')[0]).toEqual({
      token: '{{file.created.yeer}}',
      suggestion: '{{file.created.year}}',
    });
    expect(findPlaceholderProblems('{{file.foo}}')).toHaveLength(1);
    expect(findPlaceholderProblems('{{foo.bar}}')).toHaveLength(1);
    expect(findPlaceholderProblems('{{}}')).toHaveLength(1);
  });

  it('flags an unclosed placeholder', () => {
    expect(findPlaceholderProblems('Work/{{file.cre')).toEqual([
      { token: '{{file.cre', suggestion: null },
    ]);
  });
});

describe('suggestPlaceholder', () => {
  it('maps a bare word to a property and keeps reserved words unsuggested', () => {
    expect(suggestPlaceholder('status')).toBe('{{property.status}}');
    expect(suggestPlaceholder('tag')).toBeNull();
    expect(suggestPlaceholder('a b')).toBeNull();
  });
});
