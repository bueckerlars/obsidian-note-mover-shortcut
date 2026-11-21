let debugEnabled = false;

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

export function debugWarn(...args: unknown[]): void {
  if (debugEnabled) {
    console.warn(...args);
  }
}

export function debugError(...args: unknown[]): void {
  if (debugEnabled) {
    console.error(...args);
  }
}

export function debugDebug(...args: unknown[]): void {
  if (debugEnabled) {
    console.debug(...args);
  }
}
