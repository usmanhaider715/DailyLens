'use client';

import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { ArticleBody } from '@/components/article/ArticleBody';
import { ArticleEditorialNotice } from '@/components/legal/SiteDisclaimers';
import { FooterLegal } from '@/components/legal/SiteDisclaimers';

export function ArticleView({ article, related }) {
  return (
    <div>
      <Navbar />
      <ArticleEditorialNotice />
      <ArticleBody article={article} related={related} />
      <div className="mx-auto max-w-3xl px-4">
        <FooterLegal />
      </div>
      <Footer />
    </div>
  );
}
