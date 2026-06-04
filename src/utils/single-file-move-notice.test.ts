import { describe, expect, it } from 'vitest';
import {
  formatDestinationFolderForNotice,
  formatSingleFileMoveMessage,
} from './single-file-move-notice';

describe('single-file-move-notice', () => {
  it('formats root destination', () => {
    expect(formatDestinationFolderForNotice('/')).toBe('/');
    expect(formatDestinationFolderForNotice('')).toBe('/');
  });

  it('normalizes trailing slashes', () => {
    expect(formatDestinationFolderForNotice('tasks/personal/')).toBe(
      'tasks/personal'
    );
  });

  it('builds move message with note title and folder', () => {
    expect(formatSingleFileMoveMessage('My Note', 'tasks/personal')).toBe(
      '"My Note" moved to tasks/personal'
    );
  });
});
