import type { HistoryEntry } from '../HistoryEntry';

// Gültiges Beispiel
const validEntry: HistoryEntry = {
    id: '1',
    sourcePath: '/source/path',
    destinationPath: '/destination/path',
    timestamp: Date.now(),
    fileName: 'note.md',
};

// Ungültige Beispiele (diese Zeilen sollten TypeScript-Fehler auslösen, wenn sie auskommentiert werden)
// const missingField: HistoryEntry = {
//     id: '2',
//     sourcePath: '/source/path',
//     destinationPath: '/destination/path',
//     timestamp: Date.now(),
//     // fileName fehlt
// };

// const wrongType: HistoryEntry = {
//     id: '3',
//     sourcePath: '/source/path',
//     destinationPath: '/destination/path',
//     timestamp: 'not-a-number', // falscher Typ
//     fileName: 'note.md',
// }; 