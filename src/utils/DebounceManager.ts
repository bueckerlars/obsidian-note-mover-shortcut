/**
 * Utility class for debouncing function calls to prevent excessive execution
 */
export class DebounceManager {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Debounce a function call with a specified delay
   * @param key Unique key for this debounced function
   * @param func Function to debounce
   * @param delay Delay in milliseconds
   */
  debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay = 100
  ): T {
    return ((...args: Parameters<T>) => {
      // Clear existing timeout for this key
      const existingTimeout = this.timeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        func(...args);
        this.timeouts.delete(key);
      }, delay);

      this.timeouts.set(key, timeout);
    }) as T;
  }

  /**
   * Cancel a debounced function call
   * @param key Key of the debounced function to cancel
   */
  cancel(key: string): void {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }

  /**
   * Cancel all debounced function calls
   */
  cancelAll(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }

  /**
   * Check if a debounced function is pending
   * @param key Key of the debounced function to check
   */
  isPending(key: string): boolean {
    return this.timeouts.has(key);
  }
}
