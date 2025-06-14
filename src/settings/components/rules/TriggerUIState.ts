export interface TriggerUIState {
    showAddConditionRow: boolean;
    addConditionType?: 'date' | 'content';
}

export class TriggerUIStateManager {
    private stateMap: Map<string, TriggerUIState> = new Map();

    getState(triggerId: string): TriggerUIState {
        if (!this.stateMap.has(triggerId)) {
            this.stateMap.set(triggerId, {
                showAddConditionRow: false
            });
        }
        return this.stateMap.get(triggerId)!;
    }

    setState(triggerId: string, state: Partial<TriggerUIState>): void {
        const currentState = this.getState(triggerId);
        this.stateMap.set(triggerId, { ...currentState, ...state });
    }

    clearState(triggerId: string): void {
        this.stateMap.delete(triggerId);
    }
} 