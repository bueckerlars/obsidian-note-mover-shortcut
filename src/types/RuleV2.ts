export type AggregationType = 'all' | 'any' | 'none';

export type CriteriaType =
  | 'tag'
  | 'fileName'
  | 'folder'
  | 'created_at'
  | 'modified_at'
  | 'extension' // file extension "*.json"
  | 'links' // wiki links to other files "[[<filename>]]"
  | 'embeds' // embedded wiki links to like "![[<filename>]]"
  | 'properties'
  | 'headings'; // Markdown headings in the file

export type RuleType =
  | 'is'
  | 'is not'
  | 'contains'
  | 'starts with'
  | 'ends with'
  | 'match regex'
  | 'does not contain'
  | 'does not starts with'
  | 'does not ends with'
  | 'does not match regex';

export interface Trigger {
  criteriaType: CriteriaType;
  ruleType: RuleType;
  value: string;
}

export interface RuleV2 {
  name: string;
  destination: string;
  aggregation: AggregationType;
  triggers: Trigger[];
  active: boolean;
}
