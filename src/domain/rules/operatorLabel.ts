/** Operator as plain language in the condition dropdown. `labels` is the active language's catalog. */
export function operatorLabel(
  operator: string,
  labels: Record<string, string>
): string {
  return labels[operator] ?? operator;
}
