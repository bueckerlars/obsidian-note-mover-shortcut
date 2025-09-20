import { Notice } from "obsidian";

export function log_update(msg: string): void {
    const notice = new Notice("", 15000);
    const noticeEl = notice.noticeEl;
    const title = document.createElement("b");
    title.textContent = "NoteMover update:";
    noticeEl.appendChild(title);
    noticeEl.appendChild(document.createElement("br"));
    const message = document.createElement("span");
    message.textContent = msg;
    noticeEl.appendChild(message);
}

export function log_info(msg: string): void {
    const notice = new Notice("", 8000);
    const noticeEl = notice.noticeEl;
    const title = document.createElement("b");
    title.textContent = "NoteMover info:";
    noticeEl.appendChild(title);
    noticeEl.appendChild(document.createElement("br"));
    const message = document.createElement("span");
    message.textContent = msg;
    noticeEl.appendChild(message);
}

export function log_error(error: Error): void {
    const notice = new Notice("", 15000);
    const noticeEl = notice.noticeEl;
    const title = document.createElement("b");
    title.textContent = "NoteMover error:";
    noticeEl.appendChild(title);
    noticeEl.appendChild(document.createElement("br"));
    const message = document.createElement("span");
    message.textContent = error.message;
    noticeEl.appendChild(message);
}