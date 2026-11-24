import { getAllTags, type CachedMetadata, type TFile } from 'obsidian';
import { RuleMatcherV2 } from '../../core/RuleMatcherV2';
import { viewClearTimeout, viewTimeout } from '../../utils/viewTimers';
import type { FileMetadata } from '../../types/Common';
import type { RuleV2 } from '../../types/RuleV2';

const PREVIEW_YIELD_EVERY = 25;

function abortError(): Error {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Metadata for matching, taken from the metadata cache. Does not read the note. */
export function fileMetadataFromCache(
  file: TFile,
  cache: CachedMetadata | null
): FileMetadata {
  const links: string[] = [];
  for (const link of cache?.links ?? []) {
    if (link.link) {
      links.push(link.link);
    }
  }
  const embeds: string[] = [];
  for (const embed of cache?.embeds ?? []) {
    if (embed.link) {
      embeds.push(embed.link);
    }
  }
  const headings: string[] = [];
  for (const heading of cache?.headings ?? []) {
    if (heading.heading) {
      headings.push(heading.heading);
    }
  }
  return {
    fileName: file.name,
    filePath: file.path,
    tags: getAllTags(cache ?? {}) ?? [],
    properties: cache?.frontmatter ?? {},
    fileContent: '',
    createdAt: file.stat?.ctime ? new Date(file.stat.ctime) : null,
    updatedAt: file.stat?.mtime ? new Date(file.stat.mtime) : null,
    extension: file.extension || '',
    links,
    embeds,
    headings,
  };
}

export interface RuleMatches {
  count: number;
  /** The first notes that matched. */
  samples: FileMetadata[];
}

const SAMPLE_LIMIT = 3;

/** Counts notes the rule matches. A later call aborts this one through `signal`. */
export async function findMatchingNotes(
  rule: RuleV2,
  files: readonly FileMetadata[],
  signal: AbortSignal,
  matcher = new RuleMatcherV2()
): Promise<RuleMatches> {
  let count = 0;
  const samples: FileMetadata[] = [];
  for (let index = 0; index < files.length; index++) {
    if (index % PREVIEW_YIELD_EVERY === 0) {
      await Promise.resolve();
      if (signal.aborted) {
        throw abortError();
      }
    }
    const match = matcher.findMatchingRule(files[index], [rule]);
    if (match) {
      count += 1;
      if (samples.length < SAMPLE_LIMIT) {
        samples.push(files[index]);
      }
    }
  }
  return { count, samples };
}

/** Debounced match count. A new update aborts the previous run. */
export function createRuleLivePreview(delayMs: number): {
  update: (
    rule: RuleV2,
    files: readonly FileMetadata[]
  ) => Promise<RuleMatches>;
  dispose: () => void;
} {
  let timer: number | null = null;
  let controller: AbortController | null = null;

  return {
    update(rule, files) {
      controller?.abort();
      if (timer !== null) {
        viewClearTimeout(timer);
        timer = null;
      }
      const next = new AbortController();
      controller = next;
      return new Promise<RuleMatches>((resolve, reject) => {
        const failIfAborted = () => {
          reject(abortError());
        };
        next.signal.addEventListener('abort', failIfAborted, { once: true });
        timer = viewTimeout(() => {
          timer = null;
          next.signal.removeEventListener('abort', failIfAborted);
          if (next.signal.aborted) {
            reject(abortError());
            return;
          }
          findMatchingNotes(rule, files, next.signal).then(resolve, reject);
        }, delayMs);
      });
    },
    dispose() {
      controller?.abort();
      if (timer !== null) {
        viewClearTimeout(timer);
        timer = null;
      }
    },
  };
}
