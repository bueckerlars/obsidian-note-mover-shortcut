import { App } from 'obsidian';

export interface DragDropItem {
  element: HTMLElement;
  index: number;
  data: any;
}

export interface DragDropOptions {
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSave?: () => Promise<void>;
  itemSelector?: string;
  handleSelector?: string;
}

export class DragDropManager {
  private draggedElement: HTMLElement | null = null;
  private draggedIndex = -1;
  private draggedData: any = null;
  private container: HTMLElement;
  private options: DragDropOptions;

  constructor(container: HTMLElement, options: DragDropOptions) {
    this.container = container;
    this.options = options;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Use event delegation for better performance
    this.container.addEventListener(
      'dragstart',
      this.handleDragStart.bind(this)
    );
    this.container.addEventListener('dragover', this.handleDragOver.bind(this));
    this.container.addEventListener('drop', this.handleDrop.bind(this));
    this.container.addEventListener('dragend', this.handleDragEnd.bind(this));
    this.container.addEventListener(
      'dragenter',
      this.handleDragEnter.bind(this)
    );
    this.container.addEventListener(
      'dragleave',
      this.handleDragLeave.bind(this)
    );
  }

  private handleDragStart(event: DragEvent): void {
    const target = event.target as HTMLElement;
    const handle = target.closest(
      this.options.handleSelector || '.noteMover-drag-handle'
    );

    if (!handle) return;

    const item = target.closest(this.options.itemSelector || '.setting-item');
    if (!item) return;

    this.draggedElement = item as HTMLElement;
    this.draggedIndex = this.getItemIndex(item as HTMLElement);
    this.draggedData = this.getItemData(item as HTMLElement);

    // Set drag data
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', this.draggedIndex.toString());
    }

    // Add dragging class
    item.classList.add('noteMover-dragging');
  }

  private handleDragOver(event: DragEvent): void {
    if (!this.draggedElement) return;

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const target = event.target as HTMLElement;
    const item = target.closest(this.options.itemSelector || '.setting-item');

    if (!item || item === this.draggedElement) return;

    // Remove previous drag-over classes
    this.clearDragOverClasses();

    // Determine drop position
    const rect = item.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isAbove = event.clientY < midpoint;

    // Check if this would result in the same position
    const targetIndex = this.getItemIndex(item as HTMLElement);
    const draggedIndex = this.getItemIndex(this.draggedElement);

    // Calculate what the new index would be
    const newIndex = isAbove ? targetIndex : targetIndex + 1;

    // Don't show drop indicator if it would result in the same position
    if (newIndex === draggedIndex || newIndex === draggedIndex + 1) {
      return;
    }

    if (isAbove) {
      item.classList.add('noteMover-drag-over-top');
    } else {
      item.classList.add('noteMover-drag-over-bottom');
    }
  }

  private handleDragEnter(event: DragEvent): void {
    if (!this.draggedElement) return;

    const target = event.target as HTMLElement;
    const item = target.closest(this.options.itemSelector || '.setting-item');

    if (item && item !== this.draggedElement) {
      // Check if this would result in the same position
      const targetIndex = this.getItemIndex(item as HTMLElement);
      const draggedIndex = this.getItemIndex(this.draggedElement);

      // Only add drag-over class if it's not the same position
      if (targetIndex !== draggedIndex && targetIndex !== draggedIndex + 1) {
        item.classList.add('noteMover-drag-over');
      }
    }
  }

  private handleDragLeave(event: DragEvent): void {
    const target = event.target as HTMLElement;
    const item = target.closest(this.options.itemSelector || '.setting-item');

    if (item && item !== this.draggedElement) {
      // Only remove if we're actually leaving the item
      const rect = item.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;

      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        item.classList.remove(
          'noteMover-drag-over',
          'noteMover-drag-over-top',
          'noteMover-drag-over-bottom'
        );
      }
    }
  }

  private handleDrop(event: DragEvent): void {
    if (!this.draggedElement) return;

    event.preventDefault();

    const target = event.target as HTMLElement;
    const item = target.closest(this.options.itemSelector || '.setting-item');

    if (!item || item === this.draggedElement) return;

    const targetIndex = this.getItemIndex(item as HTMLElement);

    // Determine final drop position
    const rect = item.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isAbove = event.clientY < midpoint;

    const finalIndex = isAbove ? targetIndex : targetIndex + 1;

    // Perform reorder
    if (
      this.draggedIndex !== finalIndex &&
      finalIndex !== this.draggedIndex + 1
    ) {
      this.options.onReorder(this.draggedIndex, finalIndex);

      // Save if callback provided
      if (this.options.onSave) {
        this.options.onSave();
      }
    }

    this.clearDragOverClasses();
  }

  private handleDragEnd(event: DragEvent): void {
    // Clean up
    if (this.draggedElement) {
      this.draggedElement.classList.remove('noteMover-dragging');
    }

    this.clearDragOverClasses();
    this.draggedElement = null;
    this.draggedIndex = -1;
    this.draggedData = null;
  }

  private getItemIndex(item: HTMLElement): number {
    const items = Array.from(
      this.container.querySelectorAll(
        this.options.itemSelector || '.setting-item'
      )
    );
    return items.indexOf(item);
  }

  private getItemData(item: HTMLElement): any {
    // Extract data from the item if needed
    // This can be customized based on requirements
    return {
      element: item,
      index: this.getItemIndex(item),
    };
  }

  private clearDragOverClasses(): void {
    const items = this.container.querySelectorAll(
      '.noteMover-drag-over, .noteMover-drag-over-top, .noteMover-drag-over-bottom'
    );
    items.forEach(item => {
      item.classList.remove(
        'noteMover-drag-over',
        'noteMover-drag-over-top',
        'noteMover-drag-over-bottom'
      );
    });
  }

  // Public method to create a drag handle
  public static createDragHandle(): HTMLElement {
    const handle = document.createElement('div');
    handle.className = 'noteMover-drag-handle';
    handle.innerHTML = '⋮⋮'; // Vertical dots
    handle.setAttribute('draggable', 'true');
    handle.setAttribute('aria-label', 'Drag to reorder');
    handle.setAttribute('role', 'button');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('title', 'Drag to reorder');

    return handle;
  }

  // Public method to wrap a setting item with drag handle
  public static wrapWithDragHandle(settingItem: HTMLElement): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-item noteMover-with-drag-handle';

    const handleContainer = document.createElement('div');
    handleContainer.className = 'noteMover-drag-handle-container';
    handleContainer.appendChild(this.createDragHandle());

    wrapper.appendChild(handleContainer);
    wrapper.appendChild(settingItem);

    return wrapper;
  }

  // Cleanup method
  public destroy(): void {
    this.container.removeEventListener(
      'dragstart',
      this.handleDragStart.bind(this)
    );
    this.container.removeEventListener(
      'dragover',
      this.handleDragOver.bind(this)
    );
    this.container.removeEventListener('drop', this.handleDrop.bind(this));
    this.container.removeEventListener(
      'dragend',
      this.handleDragEnd.bind(this)
    );
    this.container.removeEventListener(
      'dragenter',
      this.handleDragEnter.bind(this)
    );
    this.container.removeEventListener(
      'dragleave',
      this.handleDragLeave.bind(this)
    );
  }
}
