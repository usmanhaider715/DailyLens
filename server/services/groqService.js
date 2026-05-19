import axios from 'axios';
import { retry } from '../utils/retry.js';
import { getSiteSettings } from '../models/SiteSettings.js';
import { cleanArticleMainBody } from '../utils/articleBodyFormat.js';
import { normalizeSeoArticleOutput, ARTICLE_CATEGORIES } from '../utils/seoArticleNormalize.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM = `You are a senior SEO editor and headline specialist at a top-tier digital newsroom (The Daily Lens).
Your job is to transform wire stories into original, search-optimized articles that rank on Google and are easy for AI assistants to cite.

NON-NEGOTIABLE RULES:
1. Return ONE valid JSON object only. No markdown fences. No commentary outside JSON.
2. Never copy source phrasing — write fresh, authoritative editorial copy.
3. Follow every character limit and field rule in the user message exactly.
4. "summary" and "followUpLinks[].text" must be PLAIN TEXT — zero HTML tags.
5. "body" must be HTML only (no markdown # or **).
6. Pick the single best category from the allowed list — match the story's main topic, not a vague default.`;

function buildUserPrompt(raw, tone, minW, maxW) {
  const sourceUrl = raw.sourceUrl || raw.url || '';
  const suggested = raw.suggestedCategory
    ? `Suggested category from source feed: "${raw.suggestedCategory}" — use this if it fits the story; otherwise choose the best match.`
    : 'No category hint — choose the best match from the allowed list.';

  return `Transform this news item into a publish-ready, highly SEO-optimized article.

═══════════════════════════════════════
SOURCE MATERIAL
═══════════════════════════════════════
Original headline: ${raw.title}
Description: ${raw.description || '(none)'}
Full text (excerpt): ${(raw.content || '').slice(0, 6000)}
Publisher: ${raw.sourceName || 'Unknown'}
Source URL: ${sourceUrl}
Story URL: ${raw.url || sourceUrl}
Published: ${raw.publishedAt || 'unknown'}
${suggested}

Editorial tone: ${tone}
Body length: ${minW}–${maxW} words (main HTML body only)

═══════════════════════════════════════
ON-PAGE SEO — FOLLOW WITH EXTREME CARE
═══════════════════════════════════════

Every field below is checked before publish. Violations hurt Google rankings.

─── 1. headline (maps to page title / H1) ───
• LENGTH: Maximum 60 characters (letters, spaces, punctuation). Count carefully.
• STRUCTURE: [Primary keyword] + [compelling hook or outcome]
• The primary keyword MUST appear in the first 40 characters when possible.
• Use title case. No clickbait lies. No ALL CAPS. No trailing period.
• Good: "Fed Rate Cut Signals Inflation Win for Markets" (48 chars)
• Bad: "Here's What You Need to Know About the Federal Reserve Meeting Today" (too long)
• Bad: "Breaking News Update" (no keyword)

─── 2. summary (meta description + social cards) ───
• LENGTH: 150–160 characters exactly (ideal for Google meta description).
• FORMAT: Plain text ONLY. No HTML, no markdown, no quotes wrapping the whole string.
• STRUCTURE: One or two sentences. Include primary keyword once. End with a hook or key fact.
• Must make sense on its own in search results.
• Good (157 chars): "The Federal Reserve cut rates by 25 basis points as inflation cooled to 2.4%, marking the first reduction since 2024 and lifting major stock indexes."
• Bad: "<strong>Fed</strong> cuts rates" (HTML forbidden)
• Bad: 90-character summary (too short for SEO)

─── 3. primaryKeyword ───
• One focused phrase (2–4 words) this article should rank for.
• Must appear in headline, summary, and opening <p>.
• Example: "Federal Reserve rate cut", "UFC Conor McGregor return"

─── 4. category ───
• EXACTLY one value from this list (spelling must match):
  ${ARTICLE_CATEGORIES.join(', ')}
• Choose the section where readers would expect this story in a news app.
• Sports story → Sports. Bitcoin → Crypto. Election → Politics. Storm → Weather.
• Do NOT default to World unless the story is truly general international news.

─── 5. tags ───
• EXACTLY 5 tags. Array of 5 strings. No more, no less.
• Each tag: 2–4 words, specific proper nouns or phrases (not single generic words).
• Mix: topic + entity + event type + geography + theme.
• Good: ["Federal Reserve", "interest rates", "US inflation", "Jerome Powell", "stock market rally"]
• Bad: ["news", "today", "update", "breaking", "world"] (too generic)
• Bad: 3 tags or 7 tags (wrong count)

─── 6. heroImageAlt ───
• Plain-text alt text (80–120 characters) describing the ideal hero photo for this story.
• Be specific: who, what, where, action. Helps editors and image SEO.
• Example: "Federal Reserve Chair Jerome Powell speaks at press conference on interest rate decision in Washington"
• The system attaches a real image from the source separately — your alt text guides relevance.

─── 7. body (article HTML) ───
• HTML only. Section headings: <h2><strong>Section Title</strong></h2>
• Paragraphs: <p>...</p>
• Bold 2–4 high-impact terms per paragraph: <strong>...</strong>
• Primary keyword in the FIRST <p> within the first 100 words.
• 10–18 Wikipedia links on first mention of notable entities:
  <a href="https://en.wikipedia.org/wiki/Exact_Article_Title" target="_blank" rel="noopener noreferrer">visible text</a>
• Do NOT include: Sources, Editorial notice, Image credit, or follow-up section (added by system).

─── 8. followUpLinks (separate from body) ───
• Exactly 5–6 items. Plain text "text" field only (no HTML).
• Each item: thoughtful question or statement that points readers to deeper reading.
• Provide "url" (full https:// link to Wikipedia OR the original publisher / authoritative source) when possible.
• OR provide "wikiTitle" (+ optional "linkPhrase" that appears verbatim in text) for Wikipedia.
• "linkPhrase" is the exact words in "text" that become the clickable link (rendered in italics on site).

─── 9. seoScore ───
• Integer 1–10. Self-rate how well you met ALL rules above (10 = perfect compliance).

═══════════════════════════════════════
RETURN JSON (exact keys)
═══════════════════════════════════════
{
  "headline": "string, max 60 chars, keyword + hook",
  "summary": "string, 150-160 chars, plain text only",
  "primaryKeyword": "string, 2-4 words",
  "category": "one allowed category",
  "tags": ["exactly", "five", "specific", "tags", "here"],
  "heroImageAlt": "string, 80-120 chars, describes ideal hero image",
  "body": "HTML article only",
  "followUpLinks": [
    { "text": "plain question or statement", "url": "https://en.wikipedia.org/wiki/Example", "linkPhrase": "words to link" }
  ],
  "seoScore": 9,
  "readTime": 5,
  "isBreaking": false
}`;
}

function parseJsonFromText(text) {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Invalid AI response from Groq');
  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function generateSeoArticle(rawArticle) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on the server');
  }

  const settings = await getSiteSettings();
  const tone = settings.articleTone || 'Neutral';
  const minW = settings.minWordCount ?? 500;
  const maxW = settings.maxWordCount ?? 800;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  return retry(async () => {
    const { data } = await axios.post(
      GROQ_URL,
      {
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildUserPrompt(rawArticle, tone, minW, maxW) },
        ],
        max_tokens: 8192,
        temperature: 0.65,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      const errMsg = data?.error?.message || 'Empty response from Groq';
      throw new Error(errMsg);
    }

    const parsed = parseJsonFromText(content);
    const normalized = normalizeSeoArticleOutput(parsed, rawArticle);
    normalized.body = cleanArticleMainBody(normalized.body || '');
    normalized.sourceAttribution = {
      sourceName: rawArticle.sourceName,
      sourceUrl: rawArticle.url || rawArticle.sourceUrl,
    };
    return normalized;
  }, 2);
}
