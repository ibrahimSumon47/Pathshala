import { listNotifications } from '@pathshala/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guard';
import { readAllNotificationsAction, readNotificationAction } from './actions';
import styles from './notifications.module.css';

type NotificationsProps = { params: Promise<{ locale: string }> };

const COPY = {
  bn: {
    back: '← ড্যাশবোর্ডে ফিরুন',
    title: 'বার্তা',
    lede: 'লাইভ ক্লাসের রিমাইন্ডার আর সিস্টেমের বার্তা এখানে জমা থাকে।',
    allRead: 'সব পড়া হয়েছে',
    markAll: 'সব পড়া হিসেবে চিহ্নিত করুন',
    mark: 'পড়া হয়েছে',
    unread: 'নতুন',
    empty: 'এখন কোনো বার্তা নেই',
    emptyBody: 'লাইভ ক্লাসের আগে মনে করানোর বার্তা এখানে আসবে।',
  },
  en: {
    back: '← Back to dashboard',
    title: 'Messages',
    lede: 'Live class reminders and system messages collect here.',
    allRead: 'All read',
    markAll: 'Mark everything read',
    mark: 'Mark read',
    unread: 'New',
    empty: 'No messages yet',
    emptyBody: 'Reminders arrive here before a live class.',
  },
} as const;

/** The notification centre: every message, with a clear unread state. */
export default async function NotificationsPage({ params }: NotificationsProps) {
  const { locale } = await params;
  const language = locale === 'en' ? 'en' : 'bn';
  const copy = COPY[language];
  const user = await requireUser();
  const notifications = await listNotifications(user.id);
  const unread = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/dashboard" className={styles.back}>
          {copy.back}
        </Link>
        <div className={styles.head}>
          <div>
            <h1>{copy.title}</h1>
            <p className={styles.lede}>{copy.lede}</p>
          </div>
          {unread > 0 ? (
            <form action={readAllNotificationsAction}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="secondary" size="sm">
                {copy.markAll}
              </Button>
            </form>
          ) : notifications.length > 0 ? (
            <Badge tone="neutral">{copy.allRead}</Badge>
          ) : null}
        </div>

        {notifications.length === 0 ? (
          <EmptyState title={copy.empty} body={copy.emptyBody} />
        ) : (
          <ul className={styles.list}>
            {notifications.map((notification) => (
              <li key={notification.id} className={notification.readAt ? styles.read : styles.unread}>
                <div>
                  <p className={styles.title}>
                    {notification.title[language] ?? notification.title.en ?? ''}
                    {notification.readAt ? null : <Badge tone="accent">{copy.unread}</Badge>}
                  </p>
                  <p className={styles.body}>{notification.body[language] ?? notification.body.en ?? ''}</p>
                  <p className={styles.meta}>{new Date(notification.createdAt).toLocaleString(locale)}</p>
                </div>
                <div className={styles.actions}>
                  <Link href={notification.href}>{language === 'en' ? 'Open' : 'খুলুন'}</Link>
                  {notification.readAt ? null : (
                    <form action={readNotificationAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={notification.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        {copy.mark}
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
