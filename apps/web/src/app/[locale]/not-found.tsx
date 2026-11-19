import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import styles from './not-found.module.css';

export const metadata: Metadata = { title: 'Page not found' };

const copy = {
  en: {
    heading: 'This page is not here',
    body: 'The address may have changed, or the course may have been unpublished. The catalogue is the quickest way back.',
    courses: 'Browse courses',
    home: 'Go to the home page',
  },
  bn: {
    heading: 'এই পাতাটি নেই',
    body: 'ঠিকানাটি বদলে থাকতে পারে, অথবা কোর্সটি আর প্রকাশ্যে নেই। কোর্সের তালিকা থেকে আবার শুরু করুন।',
    courses: 'কোর্স দেখুন',
    home: 'প্রথম পাতায় যান',
  },
} as const;

/** 404 inside the locale layout, so the page keeps the language and the theme. */
export default async function NotFound() {
  const locale = await getLocale();
  const text = locale === 'bn' ? copy.bn : copy.en;

  return (
    <div className={`container ${styles.page}`}>
      <EmptyState
        title={text.heading}
        body={text.body}
        action={
          <div className={styles.actions}>
            <Link href="/courses" className={buttonStyles()}>
              {text.courses}
            </Link>
            <Link href="/" className={buttonStyles({ variant: 'secondary' })}>
              {text.home}
            </Link>
          </div>
        }
      />
    </div>
  );
}
