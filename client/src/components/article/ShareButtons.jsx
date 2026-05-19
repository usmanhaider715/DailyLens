import { Facebook, Linkedin, Link as LinkIcon, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function buildUrl(platform, url, title) {
  const enc = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  if (platform === 'twitter') return `https://twitter.com/intent/tweet?url=${enc}&text=${t}`;
  if (platform === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${enc}`;
  if (platform === 'linkedin') return `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`;
  if (platform === 'whatsapp') return `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  return url;
}

export function ShareButtons({ url, title }) {
  const share = async (platform) => {
    const data = { title, text: title, url };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* fallback */
      }
    }
    window.open(buildUrl(platform, url, title), '_blank', 'noopener,noreferrer');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => share('twitter')}
        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        X / Twitter
      </button>
      <button
        type="button"
        onClick={() => share('whatsapp')}
        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() => share('facebook')}
        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        <Facebook className="h-3.5 w-3.5" />
        Facebook
      </button>
      <button
        type="button"
        onClick={() => share('linkedin')}
        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        <Linkedin className="h-3.5 w-3.5" />
        LinkedIn
      </button>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        <LinkIcon className="h-3.5 w-3.5" />
        Copy
      </button>
    </div>
  );
}
