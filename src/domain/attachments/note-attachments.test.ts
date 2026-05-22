import { describe, expect, it } from 'vitest';
import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import {
  buildAttachmentMovePlans,
  collectNoteAttachments,
  computeCoMovedAttachmentPath,
  isAttachmentUnderNoteFolder,
  isSharedAttachment,
} from './note-attachments';

function mockFile(path: string, extension = 'md'): TFile {
  const file = new TFile();
  file.path = path;
  file.name = path.split('/').pop() ?? path;
  file.extension = extension;
  return file;
}

describe('note-attachments', () => {
  describe('isAttachmentUnderNoteFolder', () => {
    it('accepts files in note subfolders', () => {
      expect(
        isAttachmentUnderNoteFolder('Folder A/_assets/a.png', 'Folder A')
      ).toBe(true);
    });

    it('rejects files outside the note folder', () => {
      expect(
        isAttachmentUnderNoteFolder('Folder B/_assets/a.png', 'Folder A')
      ).toBe(false);
    });

    it('for root notes only accepts root-level attachments', () => {
      expect(isAttachmentUnderNoteFolder('image.png', '')).toBe(true);
      expect(isAttachmentUnderNoteFolder('_assets/a.png', '')).toBe(false);
    });
  });

  describe('computeCoMovedAttachmentPath', () => {
    it('preserves relative _assets path when note moves between folders', () => {
      expect(
        computeCoMovedAttachmentPath(
          'Folder A/study.md',
          'Folder B/study.md',
          'Folder A/_assets/image1.png'
        )
      ).toBe('Folder B/_assets/image1.png');
    });

    it('returns null for attachments outside the note folder', () => {
      expect(
        computeCoMovedAttachmentPath(
          'Folder A/study.md',
          'Folder B/study.md',
          'Folder A/../other/image.png'
        )
      ).toBeNull();
    });
  });

  describe('isSharedAttachment', () => {
    it('detects backlinks from other notes', () => {
      const resolvedLinks = {
        'Folder A/study.md': { 'Folder A/_assets/a.png': 1 },
        'Folder C/other.md': { 'Folder A/_assets/a.png': 1 },
      };
      expect(
        isSharedAttachment(
          resolvedLinks,
          'Folder A/_assets/a.png',
          'Folder A/study.md'
        )
      ).toBe(true);
    });

    it('returns false when only the moving note references the file', () => {
      const resolvedLinks = {
        'Folder A/study.md': { 'Folder A/_assets/a.png': 1 },
      };
      expect(
        isSharedAttachment(
          resolvedLinks,
          'Folder A/_assets/a.png',
          'Folder A/study.md'
        )
      ).toBe(false);
    });
  });

  describe('collectNoteAttachments', () => {
    it('resolves embeds and links to non-movable files under the note folder', () => {
      const note = mockFile('Folder A/study.md');
      const attachment = mockFile('Folder A/_assets/image1.png', 'png');

      const app = {
        metadataCache: {
          getFileCache: () => ({
            links: [],
            embeds: [{ link: '_assets/image1.png' }],
          }),
          getFirstLinkpathDest: (link: string, _source: string) =>
            link === '_assets/image1.png' ? attachment : null,
        },
      } as unknown as App;

      const refs = collectNoteAttachments(app, note);
      expect(refs).toHaveLength(1);
      expect(refs[0]!.path).toBe('Folder A/_assets/image1.png');
    });

    it('skips wiki links to other markdown notes', () => {
      const note = mockFile('Folder A/study.md');
      const otherNote = mockFile('Folder A/other.md');

      const app = {
        metadataCache: {
          getFileCache: () => ({
            links: [{ link: 'other' }],
            embeds: [],
          }),
          getFirstLinkpathDest: (link: string) =>
            link === 'other' ? otherNote : null,
        },
      } as unknown as App;

      expect(collectNoteAttachments(app, note)).toHaveLength(0);
    });
  });

  describe('buildAttachmentMovePlans', () => {
    it('builds plans for unshared attachments', () => {
      const note = mockFile('Folder A/study.md');
      const attachment = mockFile('Folder A/_assets/a.png', 'png');

      const app = {
        metadataCache: {
          getFileCache: () => ({
            links: [],
            embeds: [{ link: '_assets/a.png' }],
          }),
          getFirstLinkpathDest: (link: string) =>
            link === '_assets/a.png' ? attachment : null,
          resolvedLinks: {
            'Folder A/study.md': { 'Folder A/_assets/a.png': 1 },
          },
        },
      } as unknown as App;

      const plans = buildAttachmentMovePlans(
        app,
        note,
        'Folder A/study.md',
        'Folder B/study.md',
        { skipSharedAttachments: true }
      );

      expect(plans).toHaveLength(1);
      expect(plans[0]!.destinationPath).toBe('Folder B/_assets/a.png');
    });

    it('skips shared attachments when configured', () => {
      const note = mockFile('Folder A/study.md');
      const attachment = mockFile('Folder A/_assets/a.png', 'png');

      const app = {
        metadataCache: {
          getFileCache: () => ({
            links: [],
            embeds: [{ link: '_assets/a.png' }],
          }),
          getFirstLinkpathDest: (link: string) =>
            link === '_assets/a.png' ? attachment : null,
          resolvedLinks: {
            'Folder A/study.md': { 'Folder A/_assets/a.png': 1 },
            'Folder C/other.md': { 'Folder A/_assets/a.png': 1 },
          },
        },
      } as unknown as App;

      const plans = buildAttachmentMovePlans(
        app,
        note,
        'Folder A/study.md',
        'Folder B/study.md',
        { skipSharedAttachments: true }
      );

      expect(plans).toHaveLength(0);
    });
  });
});
