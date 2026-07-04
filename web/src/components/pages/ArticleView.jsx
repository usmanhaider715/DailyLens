'use client';

import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { ArticleBody } from '@/components/article/ArticleBody';
import { FooterLegal } from '@/components/legal/SiteDisclaimers';

export function ArticleView({ article, related }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <ArticleBody article={article} related={related} />
      <div className="mx-auto max-w-3xl px-4">
        <FooterLegal />
      </div>
      <Footer />
    </div>
  );
}
