export class Notice {
    noticeEl: HTMLDivElement;
    constructor(_msg: string, _timeout?: number) {
        this.noticeEl = document.createElement('div');
    }
} 