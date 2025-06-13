export class Notice {
    noticeEl: HTMLElement;
    constructor() {
        this.noticeEl = document.createElement('div');
    }
    hide() {}
}

export const getAllTags = jest.fn(() => ['#test']); 