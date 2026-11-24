import { PropertySuggest } from './PropertySuggest';
import { SuggestRegistry } from './suggestLifecycle';

describe('suggest lifecycle', () => {
  it('keeps the metadataCache listener count constant across re-renders', () => {
    const live = new Set<unknown>();
    const metadataCache = {
      on: vi.fn((_name: string, _callback: () => void) => {
        const ref = {};
        live.add(ref);
        return ref;
      }),
      offref: vi.fn((ref: unknown) => {
        live.delete(ref);
      }),
    };
    const app = {
      metadataCache,
      vault: { getMarkdownFiles: () => [] },
    };
    const registry = new SuggestRegistry();

    for (let render = 0; render < 4; render += 1) {
      registry.destroy();
      registry.add(
        new PropertySuggest(app as never, document.createElement('input'))
      );
    }

    expect(metadataCache.on).toHaveBeenCalledTimes(4);
    expect(metadataCache.offref).toHaveBeenCalledTimes(3);
    expect(live.size).toBe(1);

    registry.destroy();
    expect(live.size).toBe(0);
  });
});
