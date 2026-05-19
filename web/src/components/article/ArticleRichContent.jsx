import { Fragment } from 'react';
import { chunkHtmlBody } from '../../utils/articleBodyFormat.js';
import { prepareArticleHtml } from '../../utils/stripHtml.js';
import { ArticleAd } from './ArticleAd.jsx';

export function ArticleRichContent({ main }) {
  const chunks = chunkHtmlBody(prepareArticleHtml(main));

  return (
    <>
      {chunks.map((chunk, idx) => (
        <Fragment key={idx}>
          <div
            className="article-html-content"
            dangerouslySetInnerHTML={{ __html: chunk }}
          />
          {idx !== chunks.length - 1 && (idx + 1) % 3 === 0 && <ArticleAd />}
        </Fragment>
      ))}
    </>
  );
}
