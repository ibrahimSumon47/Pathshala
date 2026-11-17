import type { CatalogSort, CourseLevel, PriceBucket } from '@pathshala/db';
import { listCatalog, listCategories } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { coursesCopy } from './copy';
import styles from './courses.module.css';

type CoursesPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const BUCKETS = ['free', 'under-500', '500-1500', 'over-1500'] as const;
const SORTS = ['newest', 'rating', 'enrolled', 'price-asc', 'price-desc'] as const;

/** Published catalogue with text search, facets and bounded pagination. */
export default async function CoursesPage({ params, searchParams }: CoursesPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = coursesCopy(language);
  const one = (key: string) => (Array.isArray(query[key]) ? query[key]?.[0] : query[key]);

  const q = one('q')?.slice(0, 80) ?? '';
  const category = one('category') ?? '';
  const levelValue = one('level') ?? '';
  const level = LEVELS.includes(levelValue as CourseLevel) ? (levelValue as CourseLevel) : undefined;
  const courseLanguage = one('language') === 'bn' || one('language') === 'en' ? (one('language') as Locale) : undefined;
  const priceValue = one('price');
  const price = BUCKETS.includes(priceValue as PriceBucket) ? (priceValue as PriceBucket) : 'all';
  const sortValue = one('sort');
  const sort = SORTS.includes(sortValue as CatalogSort) ? (sortValue as CatalogSort) : 'newest';
  const page = Math.max(1, Number.parseInt(one('page') ?? '1', 10) || 1);

  const [result, categories] = await Promise.all([
    listCatalog({
      ...(q ? { q } : {}),
      ...(category ? { category } : {}),
      ...(level ? { level } : {}),
      ...(courseLanguage ? { language: courseLanguage } : {}),
      price,
      sort,
      page,
    }),
    listCategories(),
  ]);

  const paramsForPage = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (category) next.set('category', category);
    if (level) next.set('level', level);
    if (courseLanguage) next.set('language', courseLanguage);
    if (price !== 'all') next.set('price', price);
    if (sort !== 'newest') next.set('sort', sort);
    if (nextPage > 1) next.set('page', String(nextPage));
    const serialized = next.toString();
    return serialized ? `/courses?${serialized}` : '/courses';
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>

        <form className={styles.filters} method="get">
          <label className={styles.searchLabel} htmlFor="course-search">
            {copy.search}
          </label>
          <div className={styles.searchRow}>
            <input
              id="course-search"
              name="q"
              type="search"
              className={styles.search}
              placeholder={copy.searchPlaceholder}
              defaultValue={q}
            />
            <button type="submit" className={buttonStyles()}>
              {copy.filter}
            </button>
          </div>
          <div className={styles.filterGrid}>
            <Select
              id="filter-category"
              name="category"
              label={copy.category}
              defaultValue={category}
              options={[
                { value: '', label: copy.allCategories },
                ...categories.map((item) => ({ value: item.slug, label: item.name[language] ?? item.name.en ?? item.slug })),
              ]}
            />
            <Select
              id="filter-level"
              name="level"
              label={copy.level}
              defaultValue={level ?? ''}
              options={[
                { value: '', label: copy.allLevels },
                ...LEVELS.map((item) => ({ value: item, label: copy[item] })),
              ]}
            />
            <Select
              id="filter-language"
              name="language"
              label={copy.language}
              defaultValue={courseLanguage ?? ''}
              options={[
                { value: '', label: copy.allLanguages },
                { value: 'bn', label: 'বাংলা' },
                { value: 'en', label: 'English' },
              ]}
            />
            <Select
              id="filter-price"
              name="price"
              label={copy.price}
              defaultValue={price}
              options={[
                { value: 'all', label: copy.allPrices },
                { value: 'free', label: copy.free },
                { value: 'under-500', label: copy.under500 },
                { value: '500-1500', label: copy.mid },
                { value: 'over-1500', label: copy.over1500 },
              ]}
            />
            <Select
              id="filter-sort"
              name="sort"
              label={copy.sort}
              defaultValue={sort}
              options={[
                { value: 'newest', label: copy.newest },
                { value: 'rating', label: copy.rating },
                { value: 'enrolled', label: copy.enrolled },
                { value: 'price-asc', label: copy.priceAsc },
                { value: 'price-desc', label: copy.priceDesc },
              ]}
            />
          </div>
          <Link href="/courses" className={styles.clear}>
            {copy.clear}
          </Link>
        </form>

        <p className={styles.count} aria-live="polite">
          {result.total} {copy.results}
        </p>

        {result.courses.length === 0 ? (
          <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
        ) : (
          <ul className={styles.grid}>
            {result.courses.map((course) => (
              <li key={course.id}>
                <Card className={styles.card}>
                  <div className={styles.cardTop}>
                    <Badge>{course.categoryName?.[language] ?? course.level}</Badge>
                    <span className={styles.price}>
                      {course.pricePaisa === 0 ? copy.freeLabel : formatPaisa(course.pricePaisa, language)}
                    </span>
                  </div>
                  <h2 className={styles.courseTitle}>{course.title[language] || course.title.en || course.title.bn}</h2>
                  <p className={styles.summary}>{course.subtitle?.[language] ?? ''}</p>
                  <p className={styles.meta}>
                    {copy.by} {course.instructorName} · ★ {course.ratingAverage.toFixed(1)} · {course.enrolmentCount}
                  </p>
                  <Link href={`/courses/${course.slug}`} className={styles.cardLink}>
                    {copy.view} →
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {result.pageCount > 1 ? (
          <nav className={styles.pagination} aria-label={copy.title}>
            {result.page > 1 ? (
              <Link href={paramsForPage(result.page - 1)} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                {copy.previous}
              </Link>
            ) : null}
            <span>
              {result.page} / {result.pageCount}
            </span>
            {result.page < result.pageCount ? (
              <Link href={paramsForPage(result.page + 1)} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                {copy.next}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
