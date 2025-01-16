import { Notice } from "obsidian";
import { NoteMoverError } from "./Error";

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

export function log_error(e: Error | NoteMoverError): void {
    const notice = new Notice("", 8000);
    const noticeEl = notice.noticeEl;
    const title = document.createElement("b");
    title.textContent = "NoteMover Error:";
    noticeEl.appendChild(title);
    noticeEl.appendChild(document.createElement("br"));
    const message = document.createElement("span");
    message.textContent = e.message;
    noticeEl.appendChild(message);

    if (e instanceof NoteMoverError && e.console_msg) {
        noticeEl.appendChild(document.createElement("br"));
        const consoleInfo = document.createElement("span");
        consoleInfo.textContent = "Check console for more information";
        noticeEl.appendChild(consoleInfo);
        console.error(`NoteMover Error:`, e.message, "\n", e.console_msg);
    }
}