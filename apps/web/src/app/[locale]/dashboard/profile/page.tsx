import { getProfileForUser } from '@pathshala/db';
import { formatPaisa } from '@pathshala/shared';
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
    memberSince: 'যুক্ত হয়েছেন',
    notGiven: 'এখনো লেখা হয়নি',
    edit: 'প্রোফাইল সম্পাদনা',
    settings: 'সেটিংস ও পাসওয়ার্ড',
    publicView: 'সবার জন্য প্রোফাইল',
    adminConsole: 'অ্যাডমিন কনসোল',
    studio: 'স্টুডিও',
    statsLabel: 'আপনার হিসাব',
    learner: {
      eyebrow: 'শিক্ষার্থী',
      enrolled: 'ভর্তি কোর্স',
      completed: 'শেষ করা',
      certificates: 'সার্টিফিকেট',
      reviews: 'দেওয়া মতামত',
      deskTitle: 'আপনার শেখার পথ',
      deskLede: 'শুরু করা প্রতিটি কোর্স শেষ করার দরকার নেই—তবে ফিরে এলে পরের পাঠটাই সহজ লাগে।',
      ofCourses: 'কোর্স শেষ করেছেন',
      noCourses: 'এখনো কোনো কোর্সে ভর্তি হননি। ক্যাটালগ থেকে শুরু করুন।',
      continueLearning: 'শেখা চালিয়ে যান',
      notes: 'নোট',
      saved: 'পরে দেখার তালিকা',
      orders: 'রসিদ',
      browse: 'কোর্স দেখুন',
    },
    instructor: {
      eyebrow: 'শিক্ষক',
      deskTitle: 'আপনার আয়ের হিসাব',
      deskLede: 'প্রতিটি বিক্রির ৮০% আপনার, ২০% পাঠশালার। টাকা পয়সায় হিসাব রাখা হয়, রিফান্ড হলে বিয়োগ হয়।',
      earnings: 'মোট আয়',
      sales: 'বিক্রি',
      students: 'শিক্ষার্থী',
      rating: 'গড় রেটিং',
      courses: 'প্রকাশিত কোর্স',
      openStudio: 'স্টুডিও খুলুন',
      viewPublic: 'পাবলিক প্রোফাইল',
      taught: 'আপনার প্রকাশিত কোর্স',
      taughtEmpty: 'প্রথম কোর্স প্রকাশ করলে সেটি এখানে দেখা যাবে।',
      noRating: 'এখনো রেটিং নেই',
    },
    admin: {
      eyebrow: 'পরিচালক',
      deskTitle: 'প্ল্যাটফর্মের অংশ',
      deskLede: 'প্রতিটি পেইড অর্ডার থেকে ২০% পাঠশালায় জমা থাকে। রিফান্ড হলে সেই অংশও ফিরে যায়।',
      share: 'প্ল্যাটফর্মের জমা',
      shareRate: 'প্রতি বিক্রিতে ২০%',
      gross: 'মোট বিক্রি',
      refunded: 'রিফান্ড',
      paidOrders: 'পেইড অর্ডার',
      average: 'গড় অর্ডার',
      users: 'ব্যবহারকারী',
      courses: 'মোট কোর্স',
      enrolments: 'নথিভুক্তি',
      openAdmin: 'অ্যাডমিন কনসোল',
    },
    formTitle: 'পরিচয় সম্পাদনা',
    formLede: 'দুই ভাষায় লিখতে পারেন; যেটি খালি থাকবে, পেজে সেটি বাদ যাবে।',
    name: 'নাম',
    headlineLabel: 'এক লাইনে পরিচয় (বাংলা)',
    headlineEnLabel: 'এক লাইনে পরিচয় (ইংরেজি)',
    bioLabel: 'নিজের সম্পর্কে (বাংলা)',
    bioEnLabel: 'নিজের সম্পর্কে (ইংরেজি)',
    save: 'সংরক্ষণ করুন',
  },
  en: {
    back: '← Back to dashboard',
    memberSince: 'Member since',
    notGiven: 'Not written yet',
    edit: 'Edit profile',
    settings: 'Settings and password',
    publicView: 'Public profile',
    adminConsole: 'Admin console',
    studio: 'Studio',
    statsLabel: 'Your numbers',
    learner: {
      eyebrow: 'Learner',
      enrolled: 'Courses joined',
      completed: 'Completed',
      certificates: 'Certificates',
      reviews: 'Reviews written',
      deskTitle: 'Your learning trail',
      deskLede: 'You do not have to finish everything you start. Coming back is what makes the next lesson easier.',
      ofCourses: 'of your courses finished',
      noCourses: 'You have not joined a course yet. The catalogue is a good place to start.',
      continueLearning: 'Keep learning',
      notes: 'Notes',
      saved: 'Saved courses',
      orders: 'Receipts',
      browse: 'Browse courses',
    },
    instructor: {
      eyebrow: 'Teacher',
      deskTitle: 'What your courses earned',
      deskLede: 'You keep 80% of every paid sale; Pathshala keeps 20% to run the school. Refunds subtract automatically.',
      earnings: 'Earned so far',
      sales: 'Sales',
      students: 'Students',
      rating: 'Average rating',
      courses: 'Published courses',
      openStudio: 'Open the studio',
      viewPublic: 'View public profile',
      taught: 'Your published courses',
      taughtEmpty: 'The first published course will appear here.',
      noRating: 'No ratings yet',
    },
    admin: {
      eyebrow: 'Operator',
      deskTitle: 'The platform share',
      deskLede: 'Every paid order sets aside 20% for Pathshala. A refund takes its share back out automatically.',
      share: 'Platform earnings',
      shareRate: '20% of every sale',
      gross: 'Gross sales',
      refunded: 'Refunded',
      paidOrders: 'Paid orders',
      average: 'Average order',
      users: 'People',
      courses: 'Courses',
      enrolments: 'Enrolments',
      openAdmin: 'Open the admin console',
    },
    formTitle: 'Edit the introduction',
    formLede: 'Write in either language; an empty side simply falls back to the other on the page.',
    name: 'Name',
    headlineLabel: 'One-line introduction (Bangla)',
    headlineEnLabel: 'One-line introduction (English)',
    bioLabel: 'About you (Bangla)',
    bioEnLabel: 'About you (English)',
    save: 'Save',
  },
} as const;

/** A reader's own profile: identity, role-specific desk, and the public page a teacher owns. */
export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { locale } = await params;
  const { saved, error } = await searchParams;
  const language = locale === 'en' ? 'en' : 'bn';
  const copy = COPY[language];
  const session = await requireUser();
  const profile = await getProfileForUser(session.id);
  if (!profile) return null;

  const isInstructor = profile.roles.includes('instructor');
  const roleCopy = copy[profile.role];
  // Roles are stored as student/instructor/admin; the page's primary role is named for people.
  const primaryRole = profile.role === 'learner' ? 'student' : profile.role;
  const extraRoles = profile.roles.filter((role) => role !== primaryRole);
  const joined = new Date(profile.joinedAt).toLocaleDateString(locale, { dateStyle: 'long' });
  const headline = profile.headline[language] ?? profile.headline.en ?? profile.headline.bn ?? '';
  const bio = profile.bio[language] ?? profile.bio.en ?? profile.bio.bn ?? '';
  const money = (value: number) => formatPaisa(value, language);
  const rating = profile.teaching.rating === null ? copy.instructor.noRating : `★ ${profile.teaching.rating.toFixed(1)}`;
  const completion =
    profile.stats.enrolled > 0 ? Math.round((profile.stats.completed / profile.stats.enrolled) * 100) : 0;

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/dashboard" className={styles.back}>
          {copy.back}
        </Link>

        <section className={styles.hero} aria-labelledby="profile-name">
          <div className={styles.cover} aria-hidden="true" />
          <div className={styles.heroBody}>
            {profile.image ? (
              <img src={profile.image} alt="" className={styles.avatar} />
            ) : (
              <span className={styles.avatarFallback} aria-hidden="true">
                {initialsFor(profile.name)}
              </span>
            )}
            <div className={styles.heroText}>
              <p className={styles.eyebrow}>{roleCopy.eyebrow}</p>
              <h1 id="profile-name" className={styles.name}>
                {profile.name}
              </h1>
              <p className={styles.headline}>{headline || copy.notGiven}</p>
              <p className={styles.meta}>
                {profile.email} · {copy.memberSince} {joined}
              </p>
              {extraRoles.length > 0 ? (
                <div className={styles.roles}>
                  {extraRoles.map((role) => (
                    <Badge key={role} tone="accent">
                      {role}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
            <div className={styles.heroActions}>
              <a href="#edit-profile" className={styles.primaryLink}>
                {copy.edit}
              </a>
              <Link href="/dashboard/settings">{copy.settings}</Link>
              {profile.role === 'admin' ? <Link href="/admin">{copy.adminConsole}</Link> : null}
              {isInstructor && profile.role !== 'admin' ? (
                <Link href={`/instructors/${profile.id}`}>{copy.publicView}</Link>
              ) : null}
            </div>
          </div>
          {bio ? <p className={styles.bio}>{bio}</p> : null}
        </section>

        {saved ? <Alert tone="success">{saved}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {profile.role === 'admin' && profile.report ? (
          <section className={`${styles.desk} ${styles.deskAdmin}`} aria-labelledby="desk-title">
            <div className={styles.deskHead}>
              <div>
                <p className={styles.deskEyebrow}>{copy.admin.eyebrow}</p>
                <h2 id="desk-title" className={styles.deskTitle}>
                  {copy.admin.deskTitle}
                </h2>
                <p className={styles.deskLede}>{copy.admin.deskLede}</p>
              </div>
              <span className={styles.rate}>{profile.report.platformSharePercent}%</span>
            </div>
            <div className={styles.deskGrid}>
              <div className={styles.heroStat}>
                <span>{copy.admin.share}</span>
                <strong>{money(profile.report.platformPaisa)}</strong>
                <em>{copy.admin.shareRate}</em>
              </div>
              <dl className={styles.facts}>
                <div>
                  <dt>{copy.admin.gross}</dt>
                  <dd>{money(profile.report.revenuePaisa)}</dd>
                </div>
                <div>
                  <dt>{copy.admin.refunded}</dt>
                  <dd>{money(profile.report.refundedPaisa)}</dd>
                </div>
                <div>
                  <dt>{copy.admin.paidOrders}</dt>
                  <dd>{profile.report.paidOrders}</dd>
                </div>
                <div>
                  <dt>{copy.admin.average}</dt>
                  <dd>{money(profile.report.averageOrderPaisa)}</dd>
                </div>
              </dl>
            </div>
            <div className={styles.deskLinks}>
              <Link href="/admin">{copy.admin.openAdmin}</Link>
              <Link href="/studio">{copy.studio}</Link>
            </div>
          </section>
        ) : null}

        {profile.role === 'instructor' ? (
          <section className={`${styles.desk} ${styles.deskTeacher}`} aria-labelledby="desk-title">
            <div className={styles.deskHead}>
              <div>
                <p className={styles.deskEyebrow}>{copy.instructor.eyebrow}</p>
                <h2 id="desk-title" className={styles.deskTitle}>
                  {copy.instructor.deskTitle}
                </h2>
                <p className={styles.deskLede}>{copy.instructor.deskLede}</p>
              </div>
              <span className={styles.rate}>80%</span>
            </div>
            <div className={styles.deskGrid}>
              <div className={styles.heroStat}>
                <span>{copy.instructor.earnings}</span>
                <strong>{money(profile.teaching.earningsPaisa)}</strong>
                <em>
                  {profile.teaching.sales} {copy.instructor.sales}
                </em>
              </div>
              <dl className={styles.facts}>
                <div>
                  <dt>{copy.instructor.students}</dt>
                  <dd>{profile.teaching.students}</dd>
                </div>
                <div>
                  <dt>{copy.instructor.rating}</dt>
                  <dd>{rating}</dd>
                </div>
                <div>
                  <dt>{copy.instructor.courses}</dt>
                  <dd>{profile.taught.length}</dd>
                </div>
              </dl>
            </div>
            <div className={styles.deskLinks}>
              <Link href="/studio">{copy.instructor.openStudio}</Link>
              <Link href={`/instructors/${profile.id}`}>{copy.instructor.viewPublic}</Link>
            </div>
          </section>
        ) : null}

        {profile.role === 'learner' ? (
          <section className={`${styles.desk} ${styles.deskLearner}`} aria-labelledby="desk-title">
            <div className={styles.deskHead}>
              <div>
                <p className={styles.deskEyebrow}>{copy.learner.eyebrow}</p>
                <h2 id="desk-title" className={styles.deskTitle}>
                  {copy.learner.deskTitle}
                </h2>
                <p className={styles.deskLede}>{copy.learner.deskLede}</p>
              </div>
              {profile.stats.enrolled > 0 ? <span className={styles.rate}>{completion}%</span> : null}
            </div>
            {profile.stats.enrolled > 0 ? (
              <>
                <p className={styles.progressLabel}>
                  {profile.stats.completed}/{profile.stats.enrolled} {copy.learner.ofCourses}
                </p>
                <div className={styles.track} aria-hidden="true">
                  <span style={{ width: `${completion}%` }} />
                </div>
              </>
            ) : (
              <p className={styles.deskLede}>{copy.learner.noCourses}</p>
            )}
            <div className={styles.deskLinks}>
              <Link href="/dashboard">{copy.learner.continueLearning}</Link>
              <Link href="/dashboard/notes">{copy.learner.notes}</Link>
              <Link href="/dashboard/wishlist">{copy.learner.saved}</Link>
              <Link href="/dashboard/orders">{copy.learner.orders}</Link>
              <Link href="/courses">{copy.learner.browse}</Link>
            </div>
          </section>
        ) : null}

        <section className={styles.stats} aria-label={copy.statsLabel}>
          {(profile.role === 'admin' && profile.report
            ? ([
                [copy.admin.users, profile.report.users],
                [copy.admin.courses, profile.report.courses],
                [copy.admin.enrolments, profile.report.enrolments],
                [copy.admin.paidOrders, profile.report.paidOrders],
              ] as const)
            : profile.role === 'instructor'
              ? ([
                  [copy.instructor.students, profile.teaching.students],
                  [copy.instructor.rating, profile.teaching.rating === null ? '—' : `★ ${profile.teaching.rating.toFixed(1)}`],
                  [copy.instructor.courses, profile.taught.length],
                  [copy.instructor.sales, profile.teaching.sales],
                ] as const)
              : ([
                  [copy.learner.enrolled, profile.stats.enrolled],
                  [copy.learner.completed, profile.stats.completed],
                  [copy.learner.certificates, profile.stats.certificates],
                  [copy.learner.reviews, profile.stats.reviews],
                ] as const)
          ).map(([label, value]) => (
            <div key={String(label)} className={styles.stat}>
              <span className={styles.statValue}>{value}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </section>

        {profile.role === 'instructor' ? (
          profile.taught.length > 0 ? (
            <CourseShelf
              courses={profile.taught}
              language={language}
              title={copy.instructor.taught}
              browseLabel={copy.studio}
              browseHref="/studio"
            />
          ) : (
            <Card className={styles.emptyTaught}>
              <p>{copy.instructor.taughtEmpty}</p>
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
