import { v4 as uuidv4 } from 'uuid';

export interface BaseRule {
    id: string;
    type: 'rule' | 'and' | 'or';
}

export interface DateCondition {
    type: 'created' | 'modified';
    operator: 'olderThan' | 'newerThan';
    days: number;
    isNew?: boolean;
}

export interface ContentCondition {
    operator: 'contains' | 'notContains';
    text: string;
}

export interface TagRule extends BaseRule {
    type: 'rule';
    tag: string;
    path: string;
    conditions?: {
        dateConditions?: DateCondition[];
        contentConditions?: ContentCondition[];
    };
}

export interface GroupRule extends BaseRule {
    type: 'and' | 'or';
    rules: Rule[];
}

export type Rule = TagRule | GroupRule;

export interface NoteMoverShortcutSettings {
    destination: string,
    inboxLocation: string,
    enablePeriodicMovement: boolean,
    periodicMovementInterval: number,
    enableFilter: boolean,
    filter: string[],
    isFilterWhitelist: boolean,
    enableRules: boolean,
    rules: Rule[],
}

export const DEFAULT_SETTINGS: NoteMoverShortcutSettings = {
    destination: '/',
    inboxLocation: '',
    enablePeriodicMovement: false,
    periodicMovementInterval: 5,
    enableFilter: false,
    filter: [],
    isFilterWhitelist: false,
    enableRules: false,
    rules: [],
}

export const generateId = (): string => {
    return uuidv4();
}

export const createNewRule = (type: 'rule' | 'and' | 'or'): Rule => {
    if (type === 'rule') {
        return {
            id: generateId(),
            type: 'rule',
            tag: '',
            path: ''
        };
    } else {
        return {
            id: generateId(),
            type,
            rules: [
                {
                    id: generateId(),
                    type: 'rule',
                    tag: '',
                    path: ''
                },
                {
                    id: generateId(),
                    type: 'rule',
                    tag: '',
                    path: ''
                }
            ]
        };
    }
} 