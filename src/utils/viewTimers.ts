function activeView(): Window {
  return activeWindow;
}

export function viewTimeout(callback: () => void, delay: number): number {
  return activeView().setTimeout(callback, delay);
}

export function viewClearTimeout(id: number): void {
  activeView().clearTimeout(id);
}

export function viewInterval(callback: () => void, delay: number): number {
  return activeView().setInterval(callback, delay);
}

export function viewClearInterval(id: number): void {
  activeView().clearInterval(id);
}

export function viewFrame(callback: () => void): number {
  return activeView().requestAnimationFrame(callback);
}

export function viewIdle(callback: () => void, timeout: number): void {
  const view = activeView();
  if (typeof view.requestIdleCallback === 'function') {
    view.requestIdleCallback(() => callback(), { timeout });
    return;
  }
  view.setTimeout(callback, 0);
}
