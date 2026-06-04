/**
 * Extracts Obsidian-style inline tags from markdown body text (after code blocks are removed).
 * Matches common `#tag` and nested `#parent/child` forms used in canvas text cards.
 */
export function extractInlineTagsFromMarkdownBody(body: string): string[] {
  const tags = new Set<string>();
  const withoutCode = stripFencedAndInlineCode(body);

  // Require tag to start at line start or after whitespace/punctuation (not mid-word).
  const tagPattern =
    /(?:^|[\s>.,;:!?()[\]{}'"`-])(#[\p{Letter}\p{Number}_/-]+)/gu;

  for (const match of withoutCode.matchAll(tagPattern)) {
    const tag = match[1];
    if (tag.length > 1) {
      tags.add(tag);
    }
  }

  return [...tags];
}

function stripFencedAndInlineCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]+`/g, ' ');
}
