'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast('This feature will be available in the near future.', { icon: '📬' });
    setEmail('');
  };

  return (
    <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 dark:border-primary-900/40 dark:bg-primary-950/40">
      <h3 className="font-display text-lg font-bold text-primary-950 dark:text-white">Morning Briefing</h3>
      <p className="mt-1 text-sm text-primary-900/80 dark:text-primary-100/80">
        Join 50,000+ readers who start their day with our curated headlines.
      </p>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="you@email.com"
          className="min-w-0 flex-1 rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm dark:border-primary-800 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary-700 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-800"
        >
          Join
        </button>
      </form>
    </div>
  );
}
