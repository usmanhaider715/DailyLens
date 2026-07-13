/**
 * Remove AI "editor note" / placeholder text that must never reach a published
 * article, e.g. "(Note: In a real article, insert a download link.)",
 * "[insert link here]", "Download your free template here.".
 *
 * AI articles are auto-published without human review, so this runs on every
 * generated body before save.
 */

// Phrases that mark a fragment as a placeholder / instruction to a human editor.
const PLACEHOLDER_TRIGGERS = [
  'in a real article',
  'insert a download link',
  'insert a link',
  'insert link here',
  'insert your link',
  'insert the link',
  'insert download link',
  'add a download link',
  'add your link here',
  'insert image here',
  'insert an image',
  'insert your',
  'placeholder text',
  'placeholder link',
  'replace this with',
  'replace with your',
  'this is a placeholder',
  'note to editor',
  "editor's note",
  'editor note',
  'todo:',
  'lorem ipsum',
  'insert cta',
  'insert call to action',
  'link goes here',
  'url goes here',
  'download link here',
  // Fake download CTAs — this site never hosts downloadable files.
  'download your free',
  'download our free',
  'download the free',
  'template here',
  'download the template',
  'download your template',
  'click here to download',
  'grab your free',
  'get your free template',
];

function hasTrigger(text) {
  const lower = String(text || '').toLowerCase();
  return PLACEHOLDER_TRIGGERS.some((t) => lower.includes(t));
}

/** Remove parenthetical editor notes like "(Note: ... insert ... here.)". */
function stripParentheticalNotes(text) {
  return text.replace(/\(([^()]*)\)/g, (match, inner) => (hasTrigger(inner) ? '' : match));
}

/** Remove bracketed placeholders like "[insert download link]" or "[link]". */
function stripBracketPlaceholders(text) {
  return text.replace(/\[([^\][]*)\]/g, (match, inner) => {
    const lower = inner.toLowerCase().trim();
    if (hasTrigger(inner)) return '';
    if (/^(insert|add|link|url|image|download|cta|placeholder|todo)\b/.test(lower)) return '';
    return match;
  });
}

/** Drop a sentence fragment when it is clearly a placeholder instruction. */
function stripTriggerSentences(text) {
  // Split on sentence boundaries but keep it simple; operate on <p>/<li> inner text too.
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !hasTrigger(sentence))
    .join(' ');
}

/**
 * Clean placeholder/editor-note content from an HTML or plain-text body.
 * Operates on text nodes so HTML tags are preserved.
 */
export function stripEditorPlaceholders(input) {
  let text = String(input || '');
  if (!text.trim()) return text;

  // 1) Remove parenthetical and bracket placeholders everywhere.
  text = stripParentheticalNotes(text);
  text = stripBracketPlaceholders(text);

  // 2) Remove whole block elements whose text is dominated by a trigger phrase.
  text = text.replace(
    /<(p|li|h[1-6]|blockquote)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (match, tag, attrs, inner) => {
      if (!hasTrigger(inner)) return match;
      const cleanedInner = stripTriggerSentences(inner).replace(/\s+/g, ' ').trim();
      // If nothing meaningful remains, drop the whole block.
      const textOnly = cleanedInner.replace(/<[^>]+>/g, '').trim();
      if (textOnly.length < 15) return '';
      return `<${tag}${attrs || ''}>${cleanedInner}</${tag}>`;
    },
  );

  // 3) Strip trigger sentences inside remaining block elements (partial cleanups).
  text = text.replace(
    /<(p|li|h[1-6]|blockquote)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (match, tag, attrs, inner) => {
      if (!hasTrigger(inner)) return match;
      const cleanedInner = stripTriggerSentences(inner).replace(/\s+/g, ' ').trim();
      return `<${tag}${attrs || ''}>${cleanedInner}</${tag}>`;
    },
  );

  // 4) For non-HTML plain text, strip trigger sentences directly.
  if (!/<[a-z][\s\S]*>/i.test(text) && hasTrigger(text)) {
    text = stripTriggerSentences(text);
  }

  // 5) Tidy leftover artifacts, including now-empty block elements.
  text = text
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/<(p|li|h[1-6]|blockquote)(\s[^>]*)?>\s*<\/\1>/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

export function bodyHasEditorPlaceholder(input) {
  return hasTrigger(input);
}
