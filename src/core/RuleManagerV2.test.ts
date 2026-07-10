import { describe, it, expect } from 'vitest';
import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import { RuleManagerV2 } from './RuleManagerV2';
import { PerformanceTraceRecorder } from '../infrastructure/debug/performance-trace';
import type { RuleV2 } from '../types/RuleV2';

function makeRule(overrides: Partial<RuleV2> = {}): RuleV2 {
  return {
    name: 'to-projects',
    destination: 'Projects',
    aggregation: 'any',
    active: true,
    triggers: [
      {
        criteriaType: 'fileName',
        operator: 'contains',
        value: 'note',
      },
    ],
    ...overrides,
  };
}

function makeApp(existingFolders: string[] = []): App {
  const folders = new Set(existingFolders);
  return {
    metadataCache: {
      getFileCache: () => ({}),
    },
    vault: {
      read: async () => '',
      adapter: {
        exists: async (path: string) => folders.has(path),
      },
      getAbstractFileByPath: (path: string) =>
        folders.has(path) ? ({ path } as unknown) : null,
    },
  } as unknown as App;
}

function makeFile(): TFile {
  const file = new TFile();
  file.path = 'Inbox/note.md';
  file.name = 'note.md';
  file.extension = 'md';
  return file;
}

function makeManager(app: App): RuleManagerV2 {
  return new RuleManagerV2(app, '/', new PerformanceTraceRecorder(() => false));
}

describe('RuleManagerV2 createFolder resolution', () => {
  it('uses the global default (true) when the rule has no override', async () => {
    const manager = makeManager(makeApp());
    manager.setRules([makeRule()]);
    manager.setCreateMissingFolders(true);

    const result = await manager.moveFileBasedOnTags(makeFile());
    expect(result).toEqual({ destination: 'Projects', createFolder: true });
  });

  it('uses the global default (false) when the rule has no override', async () => {
    const manager = makeManager(makeApp());
    manager.setRules([makeRule()]);
    manager.setCreateMissingFolders(false);

    const result = await manager.moveFileBasedOnTags(makeFile());
    expect(result).toEqual({ destination: 'Projects', createFolder: false });
  });

  it('per-rule override true wins over global default false', async () => {
    const manager = makeManager(makeApp());
    manager.setRules([makeRule({ createDestinationFolder: true })]);
    manager.setCreateMissingFolders(false);

    const result = await manager.moveFileBasedOnTags(makeFile());
    expect(result?.createFolder).toBe(true);
  });

  it('per-rule override false wins over global default true', async () => {
    const manager = makeManager(makeApp());
    manager.setRules([makeRule({ createDestinationFolder: false })]);
    manager.setCreateMissingFolders(true);

    const result = await manager.moveFileBasedOnTags(makeFile());
    expect(result?.createFolder).toBe(false);
  });
});

describe('RuleManagerV2 preview with auto-create disabled', () => {
  it('blocks the move when the destination folder is missing', async () => {
    const manager = makeManager(makeApp([]));
    manager.setRules([makeRule({ createDestinationFolder: false })]);
    manager.setCreateMissingFolders(true);

    const preview = await manager.generatePreviewForFile(makeFile());
    expect(preview.willBeMoved).toBe(false);
    expect(preview.createFolder).toBe(false);
    expect(preview.blockReason).toContain('does not exist');
  });

  it('allows the move when the destination folder already exists', async () => {
    const manager = makeManager(makeApp(['Projects']));
    manager.setRules([makeRule({ createDestinationFolder: false })]);
    manager.setCreateMissingFolders(true);

    const preview = await manager.generatePreviewForFile(makeFile());
    expect(preview.willBeMoved).toBe(true);
    expect(preview.createFolder).toBe(false);
  });
});
