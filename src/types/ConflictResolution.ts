/** How to handle a move when the target path already exists. */
export type ConflictResolutionStrategy =
  | 'ask'
  | 'skip'
  | 'rename'
  | 'overwrite';

/** User choice for a single conflicting move. */
export type ConflictResolutionAction =
  | 'skip'
  | 'rename'
  | 'overwrite'
  | 'cancel';

export interface ConflictResolutionSettings {
  /** Default strategy when a target file already exists. */
  strategy: ConflictResolutionStrategy;
}

export interface ConflictModalResult {
  action: ConflictResolutionAction;
  /** When true, persist the chosen action as the default strategy. */
  applyAlways: boolean;
}

export interface ResolvedNoteMovePath {
  newPath: string;
  action: Exclude<ConflictResolutionAction, 'skip' | 'cancel'>;
}
