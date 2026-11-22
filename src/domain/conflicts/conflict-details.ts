export function countWords(text: string): number {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

export type EditedWhen =
  { kind: 'today'; time: string } | { kind: 'date'; date: string };

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Today as a time, otherwise "3 Nov", with the year once it is not this year. */
export function describeEdited(mtime: number, now: number): EditedWhen {
  const edited = new Date(mtime);
  const today = new Date(now);
  if (edited.toDateString() === today.toDateString()) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return {
      kind: 'today',
      time: `${pad(edited.getHours())}:${pad(edited.getMinutes())}`,
    };
  }
  const date = `${edited.getDate()} ${MONTHS[edited.getMonth()]}`;
  return {
    kind: 'date',
    date:
      edited.getFullYear() === today.getFullYear()
        ? date
        : `${date} ${edited.getFullYear()}`,
  };
}
