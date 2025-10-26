export type AggregationType = 'all' | 'any' | 'none';

// Base Criteria Types
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

// Text-based operators (fileName, folder, extension, headings)
export type TextOperator =
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

// List-based operators (tag, links, embeds)
export type ListOperator =
  | 'includes item'
  | 'does not include item'
  | 'all are'
  | 'all start with'
  | 'all end with'
  | 'all match regex'
  | 'any contain'
  | 'any end with'
  | 'any match regex'
  | 'none contain'
  | 'none start with'
  | 'none end with'
  | 'count is'
  | 'count is not'
  | 'count is less than'
  | 'count is more than';

// Date-based operators (created_at, modified_at)
export type DateOperator =
  | 'is'
  | 'is before'
  | 'is after'
  | 'time is before'
  | 'time is after'
  | 'time is before now'
  | 'time is after now'
  | 'date is'
  | 'date is not'
  | 'date is before'
  | 'date is after'
  | 'date is today'
  | 'date is not today'
  | 'is under X days ago'
  | 'is over X days ago'
  | 'day of week is'
  | 'day of week is not'
  | 'day of week is before'
  | 'day of week is after'
  | 'day of month is'
  | 'day of month is not'
  | 'day of month is before'
  | 'day of month is after'
  | 'month is'
  | 'month is not'
  | 'month is before'
  | 'month is after'
  | 'year is'
  | 'year is not'
  | 'year is before'
  | 'year is after';

// Base Property operators (always available for all property types)
export type BasePropertyOperator =
  | 'has any value'
  | 'has no value'
  | 'property is present'
  | 'property is missing';

// Text Property operators (properties with text type)
export type TextPropertyOperator = BasePropertyOperator | TextOperator;

// Number Property operators (properties with number type)
export type NumberPropertyOperator =
  | BasePropertyOperator
  | 'equals'
  | 'does not equal'
  | 'is less than'
  | 'is more than'
  | 'is divisible by'
  | 'is not divisible by';

// List Property operators (properties with list type)
export type ListPropertyOperator = BasePropertyOperator | ListOperator;

// Date Property operators (properties with date type)
export type DatePropertyOperator = BasePropertyOperator | DateOperator;

// Checkbox Property operators (properties with checkbox type)
export type CheckboxPropertyOperator =
  | BasePropertyOperator
  | 'is true'
  | 'is false';

// Union type for all possible operators
export type Operator =
  | TextOperator
  | ListOperator
  | DateOperator
  | BasePropertyOperator
  | TextPropertyOperator
  | NumberPropertyOperator
  | ListPropertyOperator
  | DatePropertyOperator
  | CheckboxPropertyOperator;

// Mapping of CriteriaType to their allowed Operators
export type CriteriaTypeToOperatorMap = {
  // Text-based criteria
  fileName: TextOperator;
  folder: TextOperator;
  extension: TextOperator;
  headings: TextOperator;

  // List-based criteria
  tag: ListOperator;
  links: ListOperator;
  embeds: ListOperator;

  // Date-based criteria
  created_at: DateOperator;
  modified_at: DateOperator;

  // Property-based criteria (runtime type determines specific operators)
  properties:
    | TextPropertyOperator
    | NumberPropertyOperator
    | ListPropertyOperator
    | DatePropertyOperator
    | CheckboxPropertyOperator;
};

// Type-safe trigger interface
export interface Trigger<T extends CriteriaType = CriteriaType> {
  criteriaType: T;
  operator: CriteriaTypeToOperatorMap[T];
  value: string;
  // For properties, we need to specify which property
  propertyName?: string;
  propertyType?: 'text' | 'number' | 'checkbox' | 'date' | 'list';
}

export interface RuleV2 {
  name: string;
  destination: string;
  aggregation: AggregationType;
  triggers: Trigger[];
  active: boolean;
}
