import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata = {
  title: 'Contact Us | The Daily Lens',
  description:
    'Get in touch with The Daily Lens editorial team. Send questions, feedback, corrections, or partnership inquiries.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">
            Contact
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gray-900 dark:text-white">Contact us</h1>
          <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Questions, feedback, corrections, or partnership inquiries — send us a message and we&apos;ll get back to
            you by email.
          </p>
        </div>
      </div>
      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10 dark:border-gray-800 dark:bg-gray-900">
          <ContactForm />
          <p className="mt-8 text-xs text-gray-500">
            Messages are sent to our editorial inbox. We typically respond within 1–2 business days.
          </p>
        </div>
      </article>
      <Footer />
    </div>
  );
}
