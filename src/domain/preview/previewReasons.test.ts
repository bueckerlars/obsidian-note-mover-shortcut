import { describe, expect, it } from 'vitest';
import {
  FILE_MOVE_SKIP_REASONS,
  previewReasonText,
  previewRowLabel,
} from './previewReasons';

describe('preview reasons', () => {
  it('gives every file move skip reason catalog text', () => {
    for (const reason of FILE_MOVE_SKIP_REASONS) {
      expect(previewReasonText(reason).trim().length).toBeGreaterThan(0);
    }
  });

  it('shows the rule when the file will be moved', () => {
    expect(
      previewRowLabel({
        willBeMoved: true,
        matchedRule: 'Inbox',
      })
    ).toBe('Inbox');
  });

  it('shows blacklist, conflict, and no match', () => {
    expect(
      previewRowLabel({
        willBeMoved: false,
        blockReason: 'Blocked by blacklist filter',
      })
    ).toBe('Blacklist');
    expect(
      previewRowLabel({
        willBeMoved: false,
        blockReason: 'A file already exists at the destination',
      })
    ).toBe('Conflict');
    expect(
      previewRowLabel({
        willBeMoved: false,
        blockReason: 'No matching rule found',
      })
    ).toBe('No match');
  });
});
