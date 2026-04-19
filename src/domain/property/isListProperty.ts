/** Whether a frontmatter value behaves like a multi-value list. */
export function isListProperty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 1;
  }

  if (typeof value === 'string') {
    return /[,\n]/.test(value) && value.split(/[,\n]/).length > 1;
  }

  return false;
}
