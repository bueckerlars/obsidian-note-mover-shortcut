/** Escape text for use inside Markdown inline code (backticks). */
export function toMarkdownInlineCode(text: string): string {
  return `\`${text.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``;
}
