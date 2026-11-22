import { afterEach, describe, expect, it } from 'vitest';
import { DragDropManager } from './DragDropManager';

const originalRect = HTMLElement.prototype.getBoundingClientRect;

let geometry: 'gesture' | 'moved' = 'gesture';
let measures = 0;

function installRects(): void {
  HTMLElement.prototype.getBoundingClientRect = function rect() {
    if (geometry === 'moved') measures += 1;
    const host = this.closest('[data-index]');
    const index = Number(host?.getAttribute('data-index') ?? '0');
    const top = geometry === 'gesture' ? index * 40 : index * 100;
    const height = geometry === 'gesture' ? 40 : 80;
    return {
      top,
      height,
      bottom: top + height,
      left: 0,
      right: 120,
      width: 120,
      x: 0,
      y: top,
      toJSON() {
        return {};
      },
    } as DOMRect;
  };
}

function pointer(type: string, clientY: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    clientX: { value: 10 },
    clientY: { value: clientY },
  });
  return event;
}

function row(index: number): HTMLElement {
  const item = document.createElement('div');
  item.className = 'setting-item';
  item.dataset.index = String(index);
  const handle = document.createElement('div');
  handle.className = 'advancedNoteMover-drag-handle';
  item.append(handle);
  return item;
}

describe('DragDropManager gesture cache', () => {
  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalRect;
    geometry = 'gesture';
    measures = 0;
    document.body.replaceChildren();
  });

  it('uses the rects from drag start and does not scan rows on dragover', () => {
    installRects();
    const container = document.createElement('div');
    const rows = [row(0), row(1), row(2)];
    container.append(...rows);
    document.body.append(container);
    const moves: Array<[number, number]> = [];
    const manager = new DragDropManager(container, {
      onReorder: (from, to) => {
        moves.push([from, to]);
      },
    });
    const original = container.querySelectorAll.bind(container);
    let scans = 0;
    container.querySelectorAll = ((selector: string) => {
      scans += 1;
      return original(selector);
    }) as typeof container.querySelectorAll;

    rows[0]
      .querySelector('.advancedNoteMover-drag-handle')
      ?.dispatchEvent(pointer('dragstart', 10));
    scans = 0;
    measures = 0;
    geometry = 'moved';

    const label = document.createTextNode('row');
    rows[2].append(label);
    expect(() => label.dispatchEvent(pointer('dragover', 120))).not.toThrow();

    expect(scans).toBe(0);
    expect(measures).toBe(0);
    expect(
      rows[2].classList.contains('advancedNoteMover-drag-over-bottom')
    ).toBe(true);

    rows[2].dispatchEvent(pointer('drop', 120));
    expect(moves).toEqual([[0, 3]]);
    manager.destroy();
  });

  it('ignores a drag event whose target is not inside a row', () => {
    installRects();
    const container = document.createElement('div');
    const rows = [row(0), row(1)];
    const loose = document.createTextNode('loose');
    container.append(loose, ...rows);
    document.body.append(container);
    const manager = new DragDropManager(container, { onReorder: () => {} });
    rows[0]
      .querySelector('.advancedNoteMover-drag-handle')
      ?.dispatchEvent(pointer('dragstart', 10));
    expect(() => loose.dispatchEvent(pointer('dragover', 50))).not.toThrow();
    expect(
      rows.some(item => item.className.includes('advancedNoteMover-drag-over'))
    ).toBe(false);
    manager.destroy();
  });
});
