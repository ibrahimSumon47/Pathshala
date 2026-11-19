import { getInstructorProfile } from '@pathshala/db';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CourseShelf } from '@/components/course-shelf';
import { Link } from '@/i18n/navigation';
import { initialsFor } from '@/lib/profile';
import styles from './instructor.module.css';

type InstructorPageProps = { params: Promise<{ locale: string; id: string }> };

/** The public profile of a teacher: who they are and what they teach. */
export async function generateMetadata({ params }: InstructorPageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getInstructorProfile(id);
  if (!profile) return { title: 'Pathshala' };
  return {
    title: `${profile.name} · Pathshala`,
    description: profile.headline.en ?? profile.headline.bn ?? undefined,
  };
}

export default async function InstructorPage({ params }: InstructorPageProps) {
  const { locale, id } = await params;
  const language = locale === 'en' ? 'en' : 'bn';
  const profile = await getInstructorProfile(id);
  if (!profile) notFound();

  const copy = {
    bn: {
      back: '← সব কোর্সে ফিরুন',
      eyebrow: 'শিক্ষক',
      notGiven: 'এই শিক্ষক এখনো নিজের সম্পর্কে লেখেননি।',
      joined: 'যুক্ত হয়েছেন',
      courses: 'প্রকাশিত কোর্স',
      learners: 'শিক্ষার্থী',
      rating: 'গড় রেটিং',
      taught: 'এই শিক্ষকের কোর্স',
      browse: 'সব কোর্স দেখুন',
    },
    en: {
      back: '← Back to all courses',
      eyebrow: 'Teacher',
      notGiven: 'This teacher has not written an introduction yet.',
      joined: 'Joined',
      courses: 'Published courses',
      learners: 'Learners',
      rating: 'Average rating',
      taught: 'Courses by this teacher',
      browse: 'Browse all courses',
    },
  } as const;
  const text = copy[language];
  const headline = profile.headline[language] ?? profile.headline.en ?? profile.headline.bn ?? '';
  const bio = profile.bio[language] ?? profile.bio.en ?? profile.bio.bn ?? '';
  const joined = new Date(profile.joinedAt).toLocaleDateString(locale, { dateStyle: 'long' });
  const learners = profile.taught.reduce((total, course) => total + course.enrolmentCount, 0);
  const rated = profile.taught.filter((course) => course.ratingCount > 0);
  const reviewCount = rated.reduce((total, course) => total + course.ratingCount, 0);
  const rating = reviewCount > 0 ? rated.reduce((total, course) => total + course.ratingAverage * course.ratingCount, 0) / reviewCount : null;

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/courses" className={styles.back}>
          {text.back}
        </Link>

        <header className={styles.hero}>
          {profile.image ? (
            <img src={profile.image} alt="" width={112} height={112} className={styles.avatar} />
          ) : (
            <span className={styles.avatarFallback} aria-hidden="true">
              {initialsFor(profile.name)}
            </span>
          )}
          <div>
            <p className={styles.eyebrow}>{text.eyebrow}</p>
            <h1 className={styles.name}>{profile.name}</h1>
            <p className={styles.headline}>{headline || text.notGiven}</p>
            <p className={styles.meta}>
              {text.joined} {joined}
            </p>
          </div>
        </header>

        {bio ? <p className={styles.bio}>{bio}</p> : null}

        <dl className={styles.facts}>
          <div>
            <dt>{text.courses}</dt>
            <dd>{profile.taught.length}</dd>
          </div>
          <div>
            <dt>{text.learners}</dt>
            <dd>{learners}</dd>
          </div>
          {rating !== null ? (
            <div>
              <dt>{text.rating}</dt>
              <dd>★ {rating.toFixed(1)}</dd>
            </div>
          ) : null}
        </dl>

        {profile.taught.length > 0 ? (
          <CourseShelf
            courses={profile.taught}
            language={language}
            title={text.taught}
            browseLabel={text.browse}
            browseHref="/courses"
          />
        ) : null}
      </div>
    </div>
  );
}
