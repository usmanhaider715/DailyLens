import fs from 'fs/promises';
import path from 'path';
import { Article } from '../models/Article.js';
import { getHeroUploadDir } from './heroFileUpload.js';

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

async function scanMediaDir(dirPath) {
  let fileCount = 0;
  let bytes = 0;
  const filenames = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fullPath = path.join(dirPath, entry.name);
      const stat = await fs.stat(fullPath);
      fileCount += 1;
      bytes += stat.size;
      filenames.push(entry.name);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  return { fileCount, bytes, filenames };
}

async function getReferencedHeroFilenames() {
  const articles = await Article.find({
    $or: [
      { 'heroImage.uploadFilename': { $exists: true, $ne: '' } },
      { 'heroImage.url': /\/uploads\/heroes\//i },
    ],
  })
    .select('heroImage.uploadFilename heroImage.url')
    .lean();

  const referenced = new Set();
  for (const doc of articles) {
    if (doc.heroImage?.uploadFilename) {
      referenced.add(doc.heroImage.uploadFilename);
    }
    const url = doc.heroImage?.url || '';
    const match = url.match(/\/uploads\/heroes\/([^/?#]+)/i);
    if (match?.[1]) referenced.add(match[1]);
  }
  return referenced;
}

async function getArticleCollectionStats() {
  try {
    const name = Article.collection.collectionName;
    const result = await Article.db.db.command({ collStats: name });
    return {
      count: result.count,
      size: result.size,
      storageSize: result.storageSize,
      totalIndexSize: result.totalIndexSize,
    };
  } catch {
    return null;
  }
}

export async function getStorageStats() {
  const heroDir = getHeroUploadDir();
  const [collStats, publishedCount, draftCount, pausedCount, media, referenced] = await Promise.all([
    getArticleCollectionStats(),
    Article.countDocuments({ isPublished: true }),
    Article.countDocuments({ isPublished: false }),
    Article.countDocuments({ isPaused: true }),
    scanMediaDir(heroDir),
    getReferencedHeroFilenames(),
  ]);

  const totalArticles = collStats?.count ?? (await Article.countDocuments());
  const articleDataBytes = collStats?.size ?? 0;
  const articleStorageBytes = collStats?.storageSize ?? 0;
  const indexBytes = collStats?.totalIndexSize ?? 0;
  const articlesTotalBytes = articleStorageBytes + indexBytes;

  const orphanedFiles = media.filenames.filter((name) => !referenced.has(name));
  const orphanedBytes = orphanedFiles.length
    ? (
        await Promise.all(
          orphanedFiles.map(async (name) => {
            try {
              const stat = await fs.stat(path.join(heroDir, name));
              return stat.size;
            } catch {
              return 0;
            }
          })
        )
      ).reduce((sum, n) => sum + n, 0)
    : 0;

  const mediaBytes = media.bytes;
  const totalBytes = articlesTotalBytes + mediaBytes;

  return {
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    articles: {
      count: totalArticles,
      published: publishedCount,
      unpublished: draftCount,
      paused: pausedCount,
      dataBytes: articleDataBytes,
      storageBytes: articleStorageBytes,
      indexBytes,
      totalBytes: articlesTotalBytes,
      dataFormatted: formatBytes(articleDataBytes),
      storageFormatted: formatBytes(articleStorageBytes),
      indexFormatted: formatBytes(indexBytes),
      totalFormatted: formatBytes(articlesTotalBytes),
      avgBytesPerArticle: totalArticles ? Math.round(articleDataBytes / totalArticles) : 0,
      avgFormatted: formatBytes(totalArticles ? articleDataBytes / totalArticles : 0),
    },
    media: {
      heroUploads: {
        fileCount: media.fileCount,
        bytes: mediaBytes,
        formatted: formatBytes(mediaBytes),
        referencedCount: referenced.size,
        orphanedCount: orphanedFiles.length,
        orphanedBytes,
        orphanedFormatted: formatBytes(orphanedBytes),
        directory: 'uploads/heroes',
      },
      totalBytes: mediaBytes,
      totalFormatted: formatBytes(mediaBytes),
    },
    breakdown: {
      articlesPercent: totalBytes ? Math.round((articlesTotalBytes / totalBytes) * 100) : 0,
      mediaPercent: totalBytes ? Math.round((mediaBytes / totalBytes) * 100) : 0,
    },
  };
}
