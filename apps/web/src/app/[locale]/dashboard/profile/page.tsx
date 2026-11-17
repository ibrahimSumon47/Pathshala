import { getProfileForUser } from '@pathshala/db';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { CourseShelf } from '@/components/course-shelf';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guard';
import { initialsFor } from '@/lib/profile';
import { updateProfileDetailsAction } from './actions';
import styles from './profile.module.css';

type ProfilePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

const COPY = {
  bn: {
    back: '← ড্যাশবোর্ডে ফিরুন',
    title: 'আপনার প্রোফাইল',
    lede: 'এই পরিচয়টাই আপনার কোর্স, নোট আর সার্টিফিকেটের সঙ্গে থাকে। শিক্ষক হলে শিক্ষার্থীরাও এটি দেখতে পান।',
    edit: 'প্রোফাইল সম্পাদনা',
    settings: 'সেটিংস ও পাসওয়ার্ড',
    publicView: 'সবার জন্য প্রোফাইল দেখুন',
    memberSince: 'যুক্ত হয়েছেন',
    notGiven: 'এখনো লেখা হয়নি',
    headline: 'এক লাইনে পরিচয়',
    bio: 'নিজের সম্পর্কে',
    stats: 'আপনার হিসাব',
    enrolled: 'ভর্তি কোর্স',
    completed: 'শেষ করা',
    certificates: 'সার্টিফিকেট',
    reviews: 'দেওয়া মতামত',
    taught: 'আপনার প্রকাশিত কোর্স',
    taughtEmpty: 'প্রথম কোর্স প্রকাশ করলে সেটি এখানে দেখা যাবে।',
    studio: 'স্টুডিওতে যান',
    formTitle: 'পরিচয় সম্পাদনা',
    formLede: 'দুই ভাষায় লিখতে পারেন; যেটি খালি থাকবে, পেজে সেটি বাদ যাবে।',
    name: 'নাম',
    headlineLabel: 'এক লাইনে পরিচয় (বাংলা)',
    headlineEnLabel: 'এক লাইনে পরিচয় (ইংরেজি)',
    bioLabel: 'নিজের সম্পর্কে (বাংলা)',
    bioEnLabel: 'নিজের সম্পর্কে (ইংরেজি)',
    save: 'সংরক্ষণ করুন',
    saved: 'প্রোফাইল সংরক্ষণ হয়েছে।',
  },
  en: {
    back: '← Back to dashboard',
    title: 'Your profile',
    lede: 'This is the identity that travels with your courses, notes and certificates. If you teach, learners see it too.',
    edit: 'Edit profile',
    settings: 'Settings and password',
    publicView: 'See the public profile',
    memberSince: 'Member since',
    notGiven: 'Not written yet',
    headline: 'In one line',
    bio: 'About you',
    stats: 'Your numbers',
    enrolled: 'Courses joined',
    completed: 'Completed',
    certificates: 'Certificates',
    reviews: 'Reviews written',
    taught: 'Your published courses',
    taughtEmpty: 'The first published course will appear here.',
    studio: 'Open the studio',
    formTitle: 'Edit the introduction',
    formLede: 'Write in either language; an empty side simply falls back to the other on the page.',
    name: 'Name',
    headlineLabel: 'One-line introduction (Bangla)',
    headlineEnLabel: 'One-line introduction (English)',
    bioLabel: 'About you (Bangla)',
    bioEnLabel: 'About you (English)',
    save: 'Save',
    saved: 'Profile saved.',
  },
} as const;

/** A reader's own profile, its learning counts, and the public page a teacher owns. */
export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { locale } = await params;
  const { saved, error } = await searchParams;
  const language = locale === 'en' ? 'en' : 'bn';
  const copy = COPY[language];
  const session = await requireUser();
  const profile = await getProfileForUser(session.id);
  if (!profile) return null;
  const canTeach = profile.roles.some((role) => role === 'instructor' || role === 'admin');
  const joined = new Date(profile.joinedAt).toLocaleDateString(locale, { dateStyle: 'long' });
  const headline = profile.headline[language] ?? profile.headline.en ?? profile.headline.bn ?? '';
  const bio = profile.bio[language] ?? profile.bio.en ?? profile.bio.bn ?? '';

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

        <Card className={styles.identity}>
          <div className={styles.identityMain}>
            {profile.image ? (
              <img src={profile.image} alt="" className={styles.avatar} />
            ) : (
              <span className={styles.avatarFallback} aria-hidden="true">
                {initialsFor(profile.name)}
              </span>
            )}
            <div>
              <h2 className={styles.name}>{profile.name}</h2>
              <p className={styles.headline}>{headline || copy.notGiven}</p>
              <p className={styles.meta}>
                {profile.email} · {copy.memberSince} {joined}
              </p>
              <div className={styles.roles}>
                {profile.roles.map((role) => (
                  <Badge key={role} tone={role === 'admin' ? 'accent' : 'neutral'}>
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <p className={styles.bio}>{bio || copy.notGiven}</p>
          <div className={styles.actions}>
            <a href="#edit-profile" className={styles.primaryLink}>
              {copy.edit}
            </a>
            <Link href="/dashboard/settings">{copy.settings}</Link>
            {canTeach ? <Link href={`/instructors/${profile.id}`}>{copy.publicView}</Link> : null}
          </div>
        </Card>

        <section className={styles.stats} aria-label={copy.stats}>
          {(
            [
              [copy.enrolled, profile.stats.enrolled],
              [copy.completed, profile.stats.completed],
              [copy.certificates, profile.stats.certificates],
              [copy.reviews, profile.stats.reviews],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className={styles.stat}>
              <span className={styles.statValue}>{value}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </section>

        {canTeach ? (
          profile.taught.length > 0 ? (
            <CourseShelf
              courses={profile.taught}
              language={language}
              title={copy.taught}
              browseLabel={copy.studio}
              browseHref="/studio"
            />
          ) : (
            <Card className={styles.emptyTaught}>
              <p>{copy.taughtEmpty}</p>
              <Link href="/studio">{copy.studio}</Link>
            </Card>
          )
        ) : null}

        <div id="edit-profile">
          <Card className={styles.formCard}>
            <h2>{copy.formTitle}</h2>
            <p className={styles.formLede}>{copy.formLede}</p>
            <form action={updateProfileDetailsAction} className={styles.form}>
              <input type="hidden" name="locale" value={locale} />
              <Field id="name" name="name" label={copy.name} defaultValue={profile.name} maxLength={80} required />
              <div className={styles.two}>
                <Field
                  id="headlineBn"
                  name="headlineBn"
                  label={copy.headlineLabel}
                  defaultValue={profile.headline.bn ?? ''}
                  maxLength={120}
                />
                <Field
                  id="headlineEn"
                  name="headlineEn"
                  label={copy.headlineEnLabel}
                  defaultValue={profile.headline.en ?? ''}
                  maxLength={120}
                />
              </div>
              <div className={styles.two}>
                <label className={styles.textareaLabel} htmlFor="bioBn">
                  {copy.bioLabel}
                  <textarea id="bioBn" name="bioBn" defaultValue={profile.bio.bn ?? ''} maxLength={600} rows={5} />
                </label>
                <label className={styles.textareaLabel} htmlFor="bioEn">
                  {copy.bioEnLabel}
                  <textarea id="bioEn" name="bioEn" defaultValue={profile.bio.en ?? ''} maxLength={600} rows={5} />
                </label>
              </div>
              <div>
                <Button type="submit">{copy.save}</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
