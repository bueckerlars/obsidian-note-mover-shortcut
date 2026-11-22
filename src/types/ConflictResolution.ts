/** How to handle a move when the target path already exists. */
export type ConflictResolutionStrategy =
  'ask' | 'skip' | 'rename' | 'overwrite';

/** User choice for a single conflicting move. */
export type ConflictResolutionAction = 'skip' | 'rename' | 'overwrite';

export interface ConflictResolutionSettings {
  /** Default strategy when a target file already exists. */
  strategy: ConflictResolutionStrategy;
}

export interface ConflictModalResult {
  action: ConflictResolutionAction;
  /** Use the same action for the other conflicts of this run. */
  applyToRest: boolean;
}

export interface ResolvedNoteMovePath {
  newPath: string;
  action: Exclude<ConflictResolutionAction, 'skip'>;
}

/** Conflicts of one bulk move. Lets one choice cover the ones still to come. */
export interface ConflictRun {
  /** Conflicts not decided yet, including the one being shown. */
  remaining: number;
  /** Set once the user chose "do this for the other conflicts". */
  sticky: ConflictResolutionAction | null;
}
