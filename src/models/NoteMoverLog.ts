interface NoteMoverLogEntry {
    fileName: string,
    source: string,
    destination: string,
    timestamp: number
}

export class NoteMoverLog {
    private log: NoteMoverLogEntry[] = [];

    constructor() {
        this.load();
    }

    public addEntry(fileName: string, source: string, destination: string) {
        this.log.push({
            fileName,
            source,
            destination,
            timestamp: Date.now()
        });
        this.save();
    }

    public getEntries() {
        return this.log;
    }

    private save() {
        localStorage.setItem('noteMoverLog', JSON.stringify(this.log));
    }

    private load() {
        const log = localStorage.getItem('noteMoverLog');
        if (log) {
            this.log = JSON.parse(log);
        }
    }

    public clear() {
        this.log = [];
        this.save();
    }

}
