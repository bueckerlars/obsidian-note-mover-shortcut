import { Modal, App, Setting, ButtonComponent } from 'obsidian';

export interface ModalSize {
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    height?: string;
    minHeight?: string;
    maxHeight?: string;
}

export interface BaseModalOptions {
    title?: string;
    titleIcon?: string;
    cssClass?: string;
    size?: ModalSize;
    autoFocus?: boolean;
    focusSelector?: string;
}

export abstract class BaseModal extends Modal {
    protected options: BaseModalOptions;

    constructor(app: App, options: BaseModalOptions = {}) {
        super(app);
        this.options = {
            autoFocus: true,
            focusSelector: '.mod-cta',
            ...options
        };
    }

    onOpen() {
        const { contentEl } = this;
        this.clearContent();
        this.addCssClass();
        this.setModalSize();
        this.createTitle();
        this.createContent();
        this.setupAutoFocus();
    }

    onClose() {
        this.clearContent();
    }

    /**
     * Clear the modal content
     */
    protected clearContent(): void {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * Add CSS class to the modal content
     */
    protected addCssClass(): void {
        const { contentEl } = this;
        if (this.options.cssClass) {
            contentEl.addClass(this.options.cssClass);
        }
    }

    /**
     * Set modal size based on options
     */
    protected setModalSize(): void {
        const modalContainer = this.contentEl.parentElement;
        if (modalContainer && this.options.size) {
            const { size } = this.options;
            if (size.width) modalContainer.style.width = size.width;
            if (size.minWidth) modalContainer.style.minWidth = size.minWidth;
            if (size.maxWidth) modalContainer.style.maxWidth = size.maxWidth;
            if (size.height) modalContainer.style.height = size.height;
            if (size.minHeight) modalContainer.style.minHeight = size.minHeight;
            if (size.maxHeight) modalContainer.style.maxHeight = size.maxHeight;
        }
    }

    /**
     * Create modal title if provided
     */
    protected createTitle(): void {
        if (!this.options.title) return;

        const { contentEl } = this;
        
        if (this.options.titleIcon) {
            const titleContainer = contentEl.createEl('div', { cls: 'modal-title-container' });
            const titleIcon = titleContainer.createEl('span', { cls: 'modal-title-icon' });
            titleIcon.innerHTML = this.options.titleIcon;
            titleContainer.createEl('h2', { 
                text: this.options.title,
                cls: 'modal-title'
            });
        } else {
            contentEl.createEl('h2', { 
                text: this.options.title,
                cls: 'modal-title'
            });
        }
    }

    /**
     * Setup auto focus on specified element
     */
    protected setupAutoFocus(): void {
        if (!this.options.autoFocus || !this.options.focusSelector) return;

        setTimeout(() => {
            const focusElement = this.contentEl.querySelector(this.options.focusSelector!) as HTMLElement;
            if (focusElement && typeof focusElement.focus === 'function') {
                focusElement.focus();
            }
        }, 10);
    }

    /**
     * Create a button container with consistent styling
     */
    protected createButtonContainer(container: HTMLElement, cssClass: string = 'modal-button-container'): HTMLElement {
        return container.createEl('div', { cls: cssClass });
    }

    /**
     * Create a button with consistent styling
     */
    protected createButton(
        container: HTMLElement, 
        text: string, 
        onClick: () => void, 
        options: {
            isPrimary?: boolean;
            isWarning?: boolean;
            icon?: string;
            tooltip?: string;
        } = {}
    ): void {
        new Setting(container)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText(text);
                if (options.icon) btn.setIcon(options.icon);
                if (options.tooltip) btn.setTooltip(options.tooltip);
                if (options.isWarning) btn.setWarning();
                if (options.isPrimary) btn.setCta();
                btn.onClick(onClick);
            });
    }

    /**
     * Create a section with consistent styling
     */
    protected createSection(container: HTMLElement, cssClass: string = 'modal-section'): HTMLElement {
        return container.createEl('div', { cls: cssClass });
    }

    /**
     * Abstract method that must be implemented by subclasses to create modal content
     */
    protected abstract createContent(): void;
}
