/** Articles visible on the public site */
export const publicArticleFilter = {
  isPublished: true,
  isPaused: { $ne: true },
  reviewStatus: { $nin: ['pending', 'rejected'] },
};

/** News feed — excludes evergreen guides */
export const newsArticleFilter = {
  ...publicArticleFilter,
  contentType: { $ne: 'evergreen' },
};

/** Published evergreen guides */
export const evergreenPublicFilter = {
  ...publicArticleFilter,
  contentType: 'evergreen',
  reviewStatus: 'published',
};
