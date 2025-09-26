import type { HistoryEntry } from '../HistoryEntry';

// Valid example
const validEntry: HistoryEntry = {
  id: '1',
  sourcePath: '/source/path',
  destinationPath: '/destination/path',
  timestamp: Date.now(),
  fileName: 'note.md',
};

// Invalid examples (these lines should trigger TypeScript errors when uncommented)
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
