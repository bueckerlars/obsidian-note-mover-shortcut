import { plainOperator } from './ruleSummary';

const GRAMMAR: Record<string, string> = {
  'does not starts with': 'does not start with',
  'does not ends with': 'does not end with',
};

/** Operator as plain language in the condition dropdown. */
export function operatorLabel(operator: string): string {
  return GRAMMAR[operator] ?? plainOperator(operator);
}
