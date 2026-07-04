'use client';

import { CategoryBadge } from '../common/CategoryBadge.jsx';
import { formatArticleDate } from '../../utils/formatDate.js';
import { ShareButtons } from './ShareButtons.jsx';
import { RelatedArticles } from './RelatedArticles.jsx';
import { ArticleAd } from './ArticleAd.jsx';
import { ReadingProgress } from './ReadingProgress.jsx';
import { ForecastBlock } from './ForecastBlock.jsx';
import { ForecastBadge } from '../common/ForecastBadge.jsx';
import { ArticleRichContent } from './ArticleRichContent.jsx';
import { HeroImage } from '../common/HeroImage.jsx';
import { splitArticleBody } from '../../utils/articleBodyFormat.js';
import { prepareArticleHtml } from '../../utils/stripHtml.js';
import { SourceNewsBriefButton } from './SourceNewsBriefButton.jsx';

function splitParagraphs(body) {
  if (!body) return [];
  const parts = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [body];
}

function isHtmlArticle(body) {
  if (!body) return false;
  return /<(h[1-6]|p|strong|h2)\b/i.test(body) || body.includes('<!-- ARTICLE_FOOTER -->');
}

export function ArticleBody({ article, related }) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const htmlArticle = isHtmlArticle(article.body);
  const { main: articleMain, followUp: articleFollowUp, footer: articleFooter } = splitArticleBody(
    article.body
  );
  const paragraphs = htmlArticle ? [] : splitParagraphs(article.body);

  return (
    <>
      <ReadingProgress />
      <article className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <figure>
          <HeroImage
            url={article.heroImage?.url}
            alt={article.heroImage?.alt || article.title}
            category={article.category}
            className="w-full rounded-2xl object-cover"
            width={1200}
            height={675}
            fetchPriority="high"
            loading="eager"
          />
          {article.heroImage?.alt && !htmlArticle && (
            <figcaption className="mt-2 text-center text-xs text-gray-500">
              {article.heroImage.alt}
            </figcaption>
          )}
        </figure>

        <h1 className="mt-8 font-display text-4xl font-bold leading-tight text-gray-900 dark:text-white md:text-[40px]">
          {article.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <CategoryBadge category={article.category} />
          {article.forecast?.enabled && <ForecastBadge confidence={article.forecast.confidence} />}
          <span>{article.author}</span>
          <span>·</span>
          <span>{formatArticleDate(article.publishedAt)}</span>
          <span>·</span>
          <span>{article.readTime || 3} min read</span>
        </div>

        <div className="mt-4">
          <ShareButtons url={url} title={article.title} />
        </div>

        <SourceNewsBriefButton article={article} />

        <ForecastBlock article={article} />

        <div className="article-content-wrap mx-auto mt-10 max-w-[720px] font-body text-[18px] leading-[1.8] text-gray-800 dark:text-gray-100">
          {htmlArticle ? (
            <ArticleRichContent main={articleMain} />
          ) : (
            <div className="prose prose-lg dark:prose-invert">
              {paragraphs.map((p, idx) => (
                <div key={idx}>
                  <p className="mb-6 whitespace-pre-wrap">{p}</p>
                  {(idx + 1) % 3 === 0 && idx !== paragraphs.length - 1 && <ArticleAd />}
                </div>
              ))}
            </div>
          )}
        </div>

        {!!article.tags?.length && (
          <div className="mt-10 flex flex-wrap gap-2">
            {article.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {htmlArticle && articleFollowUp && (
          <div
            className="article-content-wrap mx-auto max-w-[720px]"
            dangerouslySetInnerHTML={{ __html: prepareArticleHtml(articleFollowUp) }}
          />
        )}

        {htmlArticle && articleFooter && (
          <div
            className="article-content-wrap mx-auto max-w-[720px]"
            dangerouslySetInnerHTML={{ __html: prepareArticleHtml(articleFooter) }}
          />
        )}

        <div className="mt-8">
          <ShareButtons url={url} title={article.title} />
        </div>

        <RelatedArticles articles={related} />
      </article>
    </>
  );
}
