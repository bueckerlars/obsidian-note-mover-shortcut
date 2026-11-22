let nextId = 0;

/**
 * Adds a helper line after `input` and returns a setter for the error text.
 * Passing null clears the error. The input gets aria-invalid and aria-describedby.
 */
export function createFieldError(
  input: HTMLElement,
  host: HTMLElement
): (message: string | null) => void {
  const errorEl = host.createDiv({
    cls: 'advancedNoteMover-field-error',
    attr: { id: `advancedNoteMover-field-error-${++nextId}` },
  });
  errorEl.hide();
  return message => {
    errorEl.setText(message ?? '');
    errorEl.toggle(message !== null);
    input.toggleClass('advancedNoteMover-input-error', message !== null);
    if (message === null) {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    } else {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', errorEl.id);
    }
  };
}
