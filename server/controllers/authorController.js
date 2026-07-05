import { Author } from '../models/Author.js';
import { Article } from '../models/Article.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';

export async function getAuthorBySlug(req, res, next) {
  try {
    const author = await Author.findOne({ slug: req.params.slug }).lean();
    if (!author) return res.status(404).json({ message: 'Author not found' });

    const articles = await Article.find({
      ...publicArticleFilter,
      author: author.name,
    })
      .sort({ publishedAt: -1 })
      .limit(30)
      .select('title slug summary category publishedAt heroImage author readTime')
      .lean();

    res.json({ author, articles });
  } catch (e) {
    next(e);
  }
}

export async function listAuthors(req, res, next) {
  try {
    const authors = await Author.find().sort({ name: 1 }).lean();
    res.json(authors);
  } catch (e) {
    next(e);
  }
}
