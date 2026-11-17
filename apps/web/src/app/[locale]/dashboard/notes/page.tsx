import { listBookmarks, listNotes } from '@pathshala/db';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guard';
import { deleteNoteAction, removeBookmarkAction } from '../library-actions';
import styles from './notes.module.css';

type NotesProps = { params: Promise<{ locale: string }> };

const COPY = {
  bn: {
    back: '← ড্যাশবোর্ডে ফিরুন',
    title: 'নোট ও বুকমার্ক',
    lede: 'পাঠের পাশে লেখা নোট আর পরে পড়ার জন্য রাখা পাঠ—সব এক জায়গায়।',
    notes: 'আপনার নোট',
    noNotes: 'এখনো কোনো নোট নেই',
    noNotesBody: 'পাঠের ভেতরে নোট লিখলে সেটি এখানে জমা হবে।',
    bookmarks: 'বুকমার্ক করা পাঠ',
    noBookmarks: 'কোনো বুকমার্ক নেই',
    noBookmarksBody: 'পাঠ খোলা অবস্থায় “বুকমার্ক” চাপলে সেই পাঠটি এখানে থাকবে।',
    open: 'পাঠ খুলুন',
    remove: 'সরান',
    delete: 'নোট মুছুন',
  },
  en: {
    back: '← Back to dashboard',
    title: 'Notes and bookmarks',
    lede: 'Notes you wrote beside a lesson and lessons you kept for later, in one place.',
    notes: 'Your notes',
    noNotes: 'No notes yet',
    noNotesBody: 'Write a note inside a lesson and it will collect here.',
    bookmarks: 'Bookmarked lessons',
    noBookmarks: 'No bookmarks yet',
    noBookmarksBody: 'Press “Bookmark” while reading a lesson and it will wait here.',
    open: 'Open lesson',
    remove: 'Remove',
    delete: 'Delete note',
  },
} as const;

/** Private notes and lesson bookmarks. */
export default async function NotesPage({ params }: NotesProps) {
  const { locale } = await params;
  const language = locale === 'en' ? 'en' : 'bn';
  const copy = COPY[language];
  const user = await requireUser();
  const [notes, bookmarks] = await Promise.all([listNotes(user.id), listBookmarks(user.id)]);

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/dashboard" className={styles.back}>
          {copy.back}
        </Link>
        <h1>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>

        <section className={styles.section}>
          <h2>{copy.notes}</h2>
          {notes.length === 0 ? (
            <EmptyState title={copy.noNotes} body={copy.noNotesBody} />
          ) : (
            <ul className={styles.list}>
              {notes.map((note) => (
                <li key={note.id} className={styles.card}>
                  <p className={styles.context}>
                    {note.courseTitle[language] ?? note.courseTitle.en ?? note.courseSlug} ·{' '}
                    {note.lessonTitle[language] ?? note.lessonTitle.en ?? ''}
                  </p>
                  <p className={styles.body}>{note.body}</p>
                  <div className={styles.actions}>
                    <Link href={`/learn/${note.courseSlug}?lesson=${note.lessonId}`} className={styles.open}>
                      {copy.open}
                    </Link>
                    <form action={deleteNoteAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={note.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        {copy.delete}
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section}>
          <h2>{copy.bookmarks}</h2>
          {bookmarks.length === 0 ? (
            <EmptyState title={copy.noBookmarks} body={copy.noBookmarksBody} />
          ) : (
            <ul className={styles.list}>
              {bookmarks.map((bookmark) => (
                <li key={bookmark.id} className={styles.card}>
                  <p className={styles.context}>
                    {bookmark.courseTitle[language] ?? bookmark.courseTitle.en ?? bookmark.courseSlug}
                  </p>
                  <p className={styles.body}>{bookmark.lessonTitle[language] ?? bookmark.lessonTitle.en ?? ''}</p>
                  <div className={styles.actions}>
                    <Link href={`/learn/${bookmark.courseSlug}?lesson=${bookmark.lessonId}`} className={styles.open}>
                      {copy.open}
                    </Link>
                    <form action={removeBookmarkAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={bookmark.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        {copy.remove}
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
