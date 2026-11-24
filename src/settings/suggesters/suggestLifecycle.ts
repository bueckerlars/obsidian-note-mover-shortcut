export interface DestroyableSuggest {
  destroy(): void;
}

interface EventRefHost {
  on(name: string, callback: () => void): unknown;
  offref(ref: unknown): void;
}

export class SuggestLifecycle {
  private stops: Array<() => void> = [];

  listen(events: EventRefHost, name: string, callback: () => void): void {
    const ref = events.on(name, callback);
    this.stops.push(() => {
      events.offref(ref);
    });
  }

  destroy(): void {
    for (const stop of this.stops) {
      stop();
    }
    this.stops = [];
  }
}

export class SuggestRegistry {
  private items: DestroyableSuggest[] = [];

  add(suggest: DestroyableSuggest | null | undefined): void {
    if (suggest) {
      this.items.push(suggest);
    }
  }

  destroy(): void {
    for (const suggest of this.items) {
      suggest.destroy();
    }
    this.items = [];
  }
}
