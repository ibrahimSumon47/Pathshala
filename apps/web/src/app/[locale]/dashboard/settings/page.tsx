import { User, connectToDatabase } from '@pathshala/db';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guard';
import {
  changePasswordAction,
  deleteAccountAction,
  updatePreferencesAction,
  updateProfileAction,
} from './actions';
import styles from './settings.module.css';

type SettingsProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

const COPY = {
  bn: {
    back: '← ড্যাশবোর্ডে ফিরুন',
    title: 'প্রোফাইল ও সেটিংস',
    lede: 'নাম, ছবি, ভাষা আর চেহারা বদলান। পাসওয়ার্ড আর বার্তার পছন্দও এখানেই।',
    profile: 'প্রোফাইল',
    name: 'নাম',
    email: 'ইমেইল',
    emailNote: 'ইমেইল বদলাতে হলে সহায়তায় লিখুন।',
    photo: 'ছবি',
    photoHint: 'PNG, JPEG বা WebP, ২০০ কিলোবাইটের মধ্যে।',
    removePhoto: 'ছবি সরান',
    language: 'ভাষা',
    save: 'সংরক্ষণ করুন',
    appearance: 'চেহারা ও বার্তা',
    theme: 'থিম',
    light: 'হালকা',
    dark: 'গাঢ়',
    system: 'সিস্টেম অনুযায়ী',
    reminders: 'লাইভ ক্লাসের রিমাইন্ডার',
    announcements: 'কোর্সের ঘোষণা',
    replies: 'আমার প্রশ্নের উত্তর',
    password: 'পাসওয়ার্ড',
    current: 'এখনকার পাসওয়ার্ড',
    next: 'নতুন পাসওয়ার্ড',
    confirm: 'নতুন পাসওয়ার্ড আবার',
    passwordHint: 'কমপক্ষে ১২ অক্ষর, একটি অক্ষর আর একটি সংখ্যা।',
    change: 'পাসওয়ার্ড বদলান',
    danger: 'অ্যাকাউন্ট মুছুন',
    dangerBody:
      'মুছে ফেললে আপনার ভর্তি, নোট, বুকমার্ক, সার্টিফিকেট আর বার্তা সব চলে যাবে। অর্ডারের হিসাব থেকে যায়। এই কাজটি ফেরানো যায় না।',
    deleteWord: 'নিশ্চিত করতে “মুছুন” লিখুন',
    delete: 'অ্যাকাউন্ট মুছুন',
  },
  en: {
    back: '← Back to dashboard',
    title: 'Profile and settings',
    lede: 'Change your name, photo, language and appearance. The password and message choices live here too.',
    profile: 'Profile',
    name: 'Name',
    email: 'Email',
    emailNote: 'Write to support if the email needs to change.',
    photo: 'Photo',
    photoHint: 'PNG, JPEG or WebP, up to 200 KB.',
    removePhoto: 'Remove photo',
    language: 'Language',
    save: 'Save',
    appearance: 'Appearance and messages',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'Follow the system',
    reminders: 'Live class reminders',
    announcements: 'Course announcements',
    replies: 'Replies to my questions',
    password: 'Password',
    current: 'Current password',
    next: 'New password',
    confirm: 'Repeat the new password',
    passwordHint: 'At least 12 characters, with a letter and a number.',
    change: 'Change password',
    danger: 'Delete account',
    dangerBody:
      'Deleting removes your enrolments, notes, bookmarks, certificates and messages. Order records remain. This cannot be undone.',
    deleteWord: 'Type DELETE to confirm',
    delete: 'Delete my account',
  },
} as const;

/** Profile, appearance, password and deletion in one calm page. */
export default async function SettingsPage({ params, searchParams }: SettingsProps) {
  const { locale } = await params;
  const { saved, error } = await searchParams;
  const language = locale === 'en' ? 'en' : 'bn';
  const copy = COPY[language];
  const session = await requireUser();
  await connectToDatabase();
  const user = await User.findById(session.id).lean();
  if (!user) return null;

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/dashboard" className={styles.back}>
          {copy.back}
        </Link>
        <h1>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>
        {saved ? <Alert tone="success">{saved}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        <Card className={styles.panel}>
          <h2>{copy.profile}</h2>
          <form action={updateProfileAction} className={styles.form} encType="multipart/form-data">
            <input type="hidden" name="locale" value={locale} />
            <div className={styles.two}>
              <Field id="name" name="name" label={copy.name} defaultValue={user.name} maxLength={80} required />
              <div className={styles.readonly}>
                <span className={styles.label}>{copy.email}</span>
                <p>{user.email}</p>
                <p className={styles.hint}>{copy.emailNote}</p>
              </div>
            </div>
            <div className={styles.two}>
              <div>
                <label className={styles.label} htmlFor="avatar">
                  {copy.photo}
                </label>
                <input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" className={styles.file} />
                <p className={styles.hint}>{copy.photoHint}</p>
                {user.image ? (
                  <label className={styles.check}>
                    <input type="checkbox" name="removeAvatar" /> {copy.removePhoto}
                  </label>
                ) : null}
              </div>
              <div className={styles.avatarWrap}>
                {user.image ? (
                  <img src={user.image} alt={`${user.name} avatar`} className={styles.avatar} />
                ) : (
                  <span className={styles.avatarFallback} aria-hidden="true">
                    {user.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <Select
              id="locale"
              name="locale"
              label={copy.language}
              defaultValue={user.locale}
              options={[
                { value: 'bn', label: 'বাংলা' },
                { value: 'en', label: 'English' },
              ]}
            />
            <div>
              <Button type="submit">{copy.save}</Button>
            </div>
          </form>
        </Card>

        <Card className={styles.panel}>
          <h2>{copy.appearance}</h2>
          <form action={updatePreferencesAction} className={styles.form}>
            <input type="hidden" name="locale" value={locale} />
            <Select
              id="theme"
              name="theme"
              label={copy.theme}
              defaultValue={user.theme ?? 'system'}
              options={[
                { value: 'system', label: copy.system },
                { value: 'light', label: copy.light },
                { value: 'dark', label: copy.dark },
              ]}
            />
            <fieldset className={styles.fieldset}>
              <legend>{copy.reminders}</legend>
              <label className={styles.check}>
                <input type="checkbox" name="reminders" defaultChecked={user.notificationPrefs?.reminders ?? true} />{' '}
                {copy.reminders}
              </label>
              <label className={styles.check}>
                <input type="checkbox" name="announcements" defaultChecked={user.notificationPrefs?.announcements ?? true} />{' '}
                {copy.announcements}
              </label>
              <label className={styles.check}>
                <input type="checkbox" name="replies" defaultChecked={user.notificationPrefs?.replies ?? true} />{' '}
                {copy.replies}
              </label>
            </fieldset>
            <div>
              <Button type="submit">{copy.save}</Button>
            </div>
          </form>
        </Card>

        <Card className={styles.panel}>
          <h2>{copy.password}</h2>
          <form action={changePasswordAction} className={styles.form}>
            <input type="hidden" name="locale" value={locale} />
            <Field id="current" name="current" type="password" label={copy.current} autoComplete="current-password" required />
            <div className={styles.two}>
              <Field id="next" name="next" type="password" label={copy.next} hint={copy.passwordHint} autoComplete="new-password" required />
              <Field id="confirm" name="confirm" type="password" label={copy.confirm} autoComplete="new-password" required />
            </div>
            <div>
              <Button type="submit" variant="secondary">
                {copy.change}
              </Button>
            </div>
          </form>
        </Card>

        <Card className={`${styles.panel} ${styles.danger}`}>
          <h2>{copy.danger}</h2>
          <p className={styles.hint}>{copy.dangerBody}</p>
          <form action={deleteAccountAction} className={styles.form}>
            <input type="hidden" name="locale" value={locale} />
            <div className={styles.two}>
              <Field id="delete-password" name="password" type="password" label={copy.current} autoComplete="current-password" required />
              <Field
                id="confirmation"
                name="confirmation"
                label={copy.deleteWord}
                placeholder={language === 'en' ? 'DELETE' : 'মুছুন'}
                required
              />
            </div>
            <div>
              <Button type="submit" variant="secondary">
                {copy.delete}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
