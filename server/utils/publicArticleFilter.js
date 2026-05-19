/** Articles visible on the public site */
export const publicArticleFilter = {
  isPublished: true,
  isPaused: { $ne: true },
};
