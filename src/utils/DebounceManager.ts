/**
 * Utility class for debouncing function calls to prevent excessive execution
 */
export class DebounceManager {
  private timeouts: Map<string, number> = new Map();

  /**
   * Debounce a function call with a specified delay
   * @param key Unique key for this debounced function
   * @param func Function to debounce
   * @param delay Delay in milliseconds
   */
  debounce<T extends unknown[]>(
    key: string,
    func: (...args: T) => void,
    delay = 100
  ): (...args: T) => void {
    return (...args: T) => {
      // Clear existing timeout for this key
      const existingTimeout = this.timeouts.get(key);
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = window.setTimeout(() => {
        func(...args);
        this.timeouts.delete(key);
      }, delay);

      this.timeouts.set(key, timeout);
    };
  }

  /**
   * Cancel a debounced function call
   * @param key Key of the debounced function to cancel
   */
  cancel(key: string): void {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      window.clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }

  /**
   * Cancel all debounced function calls
   */
  cancelAll(): void {
    this.timeouts.forEach(timeout => window.clearTimeout(timeout));
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
