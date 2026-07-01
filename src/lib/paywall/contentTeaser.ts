const DEFAULT_MAX_CHARS = 280;

/** First paragraph of markdown/plain text, capped for locked paywall preview. */
export function getContentTeaser(markdown: string, maxChars = DEFAULT_MAX_CHARS): string {
  const trimmed = markdown.trim();
  if (!trimmed) return '';

  const firstBlock = trimmed.split(/\n\n+/)[0]?.trim() ?? trimmed;
  const singleLine = firstBlock.replace(/\s+/g, ' ');

  if (singleLine.length <= maxChars) return singleLine;
  const cut = singleLine.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}
