import { setIcon } from 'obsidian';
import { strings } from '../i18n/locale';

export interface DragDropItem {
  element: HTMLElement;
  index: number;
  data: unknown;
}

export interface DragDropOptions {
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** Move one slot. `direction` is -1 for up and 1 for down. */
  onMove?: (index: number, direction: -1 | 1) => void;
  onSave?: () => Promise<void>;
  itemSelector?: string;
  handleSelector?: string;
}

export class DragDropManager {
  private draggedElement: Element | null = null;
  private draggedIndex = -1;
  private draggedData: unknown = null;
  private gesture: {
    items: Element[];
    rects: Map<Element, DOMRect>;
  } | null = null;
  private marked: Element | null = null;
  private container: HTMLElement;
  private options: DragDropOptions;

  private readonly onDragStartBound: (event: DragEvent) => void;
  private readonly onDragOverBound: (event: DragEvent) => void;
  private readonly onDropBound: (event: DragEvent) => void;
  private readonly onDragEndBound: (event: DragEvent) => void;
  private readonly onDragEnterBound: (event: DragEvent) => void;
  private readonly onDragLeaveBound: (event: DragEvent) => void;
  private readonly onKeyDownBound: (event: KeyboardEvent) => void;

  constructor(container: HTMLElement, options: DragDropOptions) {
    this.container = container;
    this.options = options;
    this.onDragStartBound = (e: DragEvent) => this.handleDragStart(e);
    this.onDragOverBound = (e: DragEvent) => this.handleDragOver(e);
    this.onDropBound = (e: DragEvent) => this.handleDrop(e);
    this.onDragEndBound = () => this.handleDragEnd();
    this.onDragEnterBound = (e: DragEvent) => this.handleDragEnter(e);
    this.onDragLeaveBound = (e: DragEvent) => this.handleDragLeave(e);
    this.onKeyDownBound = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Use event delegation for better performance (stable references for removeEventListener)
    this.container.addEventListener('dragstart', this.onDragStartBound);
    this.container.addEventListener('dragover', this.onDragOverBound);
    this.container.addEventListener('drop', this.onDropBound);
    this.container.addEventListener('dragend', this.onDragEndBound);
    this.container.addEventListener('dragenter', this.onDragEnterBound);
    this.container.addEventListener('dragleave', this.onDragLeaveBound);
    this.container.addEventListener('keydown', this.onKeyDownBound);
  }

  private itemSelector(): string {
    return this.options.itemSelector || '.setting-item';
  }

  private handleSelector(): string {
    return this.options.handleSelector || '.advancedNoteMover-drag-handle';
  }

  /** Alt+Arrow moves the focused handle one slot. Drag still uses onReorder. */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.options.onMove) return;
    if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const handle = target.closest(this.handleSelector());
    if (!handle || !this.container.contains(handle)) return;
    const item = handle.closest(this.itemSelector());
    if (!item) return;
    const items = Array.from(
      this.container.querySelectorAll(this.itemSelector())
    );
    const index = items.indexOf(item);
    if (index < 0) return;
    const direction: -1 | 1 = event.key === 'ArrowUp' ? -1 : 1;
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    event.preventDefault();
    this.options.onMove(index, direction);
  }

  private eventElement(event: Event): Element | null {
    const target = event.target;
    if (target instanceof Element) return target;
    if (
      target !== null &&
      typeof target === 'object' &&
      'parentElement' in target
    ) {
      const parent = target.parentElement;
      return parent instanceof Element ? parent : null;
    }
    return null;
  }

  /** One measurement of every row for this drag. dragover reads this cache. */
  private beginGesture(): void {
    const items = Array.from(
      this.container.querySelectorAll(this.itemSelector())
    );
    const rects = new Map<Element, DOMRect>();
    for (const item of items) {
      rects.set(item, item.getBoundingClientRect());
    }
    this.gesture = { items, rects };
  }

  private endGesture(): void {
    this.clearMarker();
    this.gesture = null;
  }

  private rowFrom(event: Event): Element | null {
    const target = this.eventElement(event);
    if (!target || !this.gesture) return null;
    const item = target.closest(this.itemSelector());
    if (!item || !this.gesture.rects.has(item)) return null;
    return item;
  }

  private handleDragStart(event: DragEvent): void {
    const target = this.eventElement(event);
    if (!target) return;
    const handle = target.closest(this.handleSelector());
    if (!handle) return;

    const item = target.closest(this.itemSelector());
    if (!item) return;

    this.beginGesture();
    this.draggedElement = item;
    this.draggedIndex = this.gesture?.items.indexOf(item) ?? -1;
    this.draggedData = this.getItemData(item);

    // Set drag data
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', this.draggedIndex.toString());
    }

    // Add dragging class
    item.classList.add('advancedNoteMover-dragging');
  }

  private handleDragOver(event: DragEvent): void {
    if (!this.draggedElement) return;

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const item = this.rowFrom(event);
    if (!item || item === this.draggedElement) return;

    this.clearMarker();

    const rect = this.gesture?.rects.get(item);
    const targetIndex = this.gesture?.items.indexOf(item) ?? -1;
    if (!rect || targetIndex < 0) return;
    const isAbove = event.clientY < rect.top + rect.height / 2;

    const draggedIndex = this.draggedIndex;

    // Calculate what the new index would be
    const newIndex = isAbove ? targetIndex : targetIndex + 1;

    // Don't show drop indicator if it would result in the same position
    if (newIndex === draggedIndex || newIndex === draggedIndex + 1) {
      return;
    }

    item.classList.add(
      isAbove
        ? 'advancedNoteMover-drag-over-top'
        : 'advancedNoteMover-drag-over-bottom'
    );
    this.marked = item;
  }

  private handleDragEnter(event: DragEvent): void {
    if (!this.draggedElement) return;

    const item = this.rowFrom(event);

    if (item && item !== this.draggedElement) {
      const targetIndex = this.gesture?.items.indexOf(item) ?? -1;
      const draggedIndex = this.draggedIndex;

      // Only add drag-over class if it's not the same position
      if (targetIndex !== draggedIndex && targetIndex !== draggedIndex + 1) {
        if (this.marked && this.marked !== item) this.clearMarker();
        item.classList.add('advancedNoteMover-drag-over');
        this.marked = item;
      }
    }
  }

  private handleDragLeave(event: DragEvent): void {
    const item = this.rowFrom(event);

    if (item && item !== this.draggedElement) {
      const rect = this.gesture?.rects.get(item);
      if (!rect) return;
      const x = event.clientX;
      const y = event.clientY;

      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        if (this.marked === item) this.clearMarker();
      }
    }
  }

  private handleDrop(event: DragEvent): void {
    if (!this.draggedElement) return;

    event.preventDefault();

    const item = this.rowFrom(event);
    if (!item || item === this.draggedElement) return;

    const targetIndex = this.gesture?.items.indexOf(item) ?? -1;
    const rect = this.gesture?.rects.get(item);
    if (!rect || targetIndex < 0) return;

    const isAbove = event.clientY < rect.top + rect.height / 2;

    const finalIndex = isAbove ? targetIndex : targetIndex + 1;

    // Perform reorder
    if (
      this.draggedIndex !== finalIndex &&
      finalIndex !== this.draggedIndex + 1
    ) {
      this.options.onReorder(this.draggedIndex, finalIndex);

      // Save if callback provided
      if (this.options.onSave) {
        void this.options.onSave();
      }
    }

    this.clearMarker();
  }

  private handleDragEnd(): void {
    if (this.draggedElement) {
      this.draggedElement.classList.remove('advancedNoteMover-dragging');
    }

    this.endGesture();
    this.draggedElement = null;
    this.draggedIndex = -1;
    this.draggedData = null;
  }

  private getItemData(item: Element): unknown {
    return {
      element: item,
      index: this.gesture?.items.indexOf(item) ?? -1,
    };
  }

  private clearMarker(): void {
    this.marked?.classList.remove(
      'advancedNoteMover-drag-over',
      'advancedNoteMover-drag-over-top',
      'advancedNoteMover-drag-over-bottom'
    );
    this.marked = null;
  }

  // Public method to create a drag handle
  public static createDragHandle(): HTMLElement {
    const handle = createDiv({
      cls: 'advancedNoteMover-drag-handle',
      attr: {
        draggable: 'true',
        'aria-label': strings().settings.rulesDragToReorder,
        role: 'button',
        tabindex: '0',
        title: strings().settings.rulesDragToReorder,
      },
    });
    setIcon(handle, 'grip-vertical');
    return handle;
  }

  // Public method to wrap a setting item with drag handle
  public static wrapWithDragHandle(settingItem: HTMLElement): HTMLElement {
    const wrapper = createDiv({
      cls: 'setting-item advancedNoteMover-with-drag-handle',
    });
    const handleContainer = wrapper.createDiv({
      cls: 'advancedNoteMover-drag-handle-container',
    });
    handleContainer.appendChild(this.createDragHandle());
    wrapper.appendChild(settingItem);
    return wrapper;
  }

  // Cleanup method
  public destroy(): void {
    this.container.removeEventListener('dragstart', this.onDragStartBound);
    this.container.removeEventListener('dragover', this.onDragOverBound);
    this.container.removeEventListener('drop', this.onDropBound);
    this.container.removeEventListener('dragend', this.onDragEndBound);
    this.container.removeEventListener('dragenter', this.onDragEnterBound);
    this.container.removeEventListener('dragleave', this.onDragLeaveBound);
    this.container.removeEventListener('keydown', this.onKeyDownBound);
  }
}
