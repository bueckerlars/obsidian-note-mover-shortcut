export class Notice {
  noticeEl: HTMLElement;
  constructor() {
    this.noticeEl = document.createElement('div');
  }
  hide() {}
}

export class AbstractInputSuggest<T> {
  constructor(app: any, inputEl: HTMLElement) {}
  getSuggestions(query: string): T[] {
    return [];
  }
  renderSuggestion(value: T, el: HTMLElement): void {}
  selectSuggestion(value: T): void {}
  close(): void {}
}

export class TFolder {
  path = '';
  name = '';
}

export class TFile {
  path = '';
  name = '';
  stat: any = {};
}

export class TAbstractFile {
  path = '';
  name = '';
}

export const getAllTags = jest.fn(() => ['#test']);
