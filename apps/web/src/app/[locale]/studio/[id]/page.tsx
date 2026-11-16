import { ATTACHMENT_MIME_TYPES, listCategories } from '@pathshala/db';
import { notFound } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import { getStudioCourse } from '@/lib/studio';
import { addLessonAction, addSectionAction, updateCourseAction } from '../actions';
import { studioCopy } from '../copy';
import styles from '../studio.module.css';

type StudioCoursePageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const TYPES = ['reading', 'video', 'quiz'] as const;

/** One course: details, publish switch, sections and lesson authoring. */
export default async function StudioCoursePage({ params, searchParams }: StudioCoursePageProps) {
  const { locale, id } = await params;
  const { error, saved } = await searchParams;
  const language = locale === 'en' ? 'en' : 'bn';
  const user = await requireRole('instructor', 'admin');
  const course = await getStudioCourse(id, user.id, user.roles.includes('admin'));
  if (!course) notFound();

  const copy = studioCopy(language);
  const categories = await listCategories();
  const published = course.status === 'published';

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/studio" className={styles.back}>
          ← {copy.back}
        </Link>
        <div className={styles.titleRow}>
          <div>
            <p className={styles.eyebrow}>{copy.courseTitle}</p>
            <h1 className={styles.title}>{course.title[language] || course.title.en || course.title.bn}</h1>
          </div>
          <Badge tone={published ? 'success' : 'neutral'}>{published ? copy.published : copy.draft}</Badge>
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">{copy.saved}</Alert> : null}

        <form action={updateCourseAction} className={styles.panel}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="courseId" value={course.id} />
          <h2 className={styles.sectionHeading}>{copy.courseTitle}</h2>
          <div className={styles.two}>
            <Field id="titleBn" name="titleBn" label={copy.titleBn} defaultValue={course.title.bn ?? ''} maxLength={200} />
            <Field id="titleEn" name="titleEn" label={copy.titleEn} defaultValue={course.title.en ?? ''} maxLength={200} />
          </div>
          <div className={styles.two}>
            <Field id="subtitleBn" name="subtitleBn" label={copy.subtitleBn} defaultValue={course.subtitle.bn ?? ''} maxLength={200} />
            <Field id="subtitleEn" name="subtitleEn" label={copy.subtitleEn} defaultValue={course.subtitle.en ?? ''} maxLength={200} />
          </div>
          <div className={styles.two}>
            <Textarea id="descriptionBn" name="descriptionBn" label={copy.descriptionBn} defaultValue={course.description.bn ?? ''} />
            <Textarea id="descriptionEn" name="descriptionEn" label={copy.descriptionEn} defaultValue={course.description.en ?? ''} />
          </div>
          <Field id="slug" name="slug" label={copy.slug} defaultValue={course.slug} maxLength={90} />
          <div className={styles.three}>
            <Select
              id="categoryId"
              name="categoryId"
              label={copy.category}
              defaultValue={course.categoryId}
              options={categories.map((category) => ({
                value: category.id,
                label: category.name[language] ?? category.name.en ?? category.slug,
              }))}
            />
            <Field
              id="priceTaka"
              name="priceTaka"
              type="number"
              min={0}
              step={1}
              defaultValue={course.pricePaisa === 0 ? 0 : course.pricePaisa / 100}
              label={copy.price}
            />
            <Select
              id="level"
              name="level"
              label={copy.level}
              defaultValue={course.level}
              options={LEVELS.map((level) => ({ value: level, label: copy.levels[level] }))}
            />
          </div>
          <Select
            id="language"
            name="language"
            label={copy.language}
            defaultValue={course.language}
            options={[
              { value: 'bn', label: 'বাংলা' },
              { value: 'en', label: 'English' },
            ]}
          />
          <label className={styles.check}>
            <input type="checkbox" name="publish" defaultChecked={published} />
            {copy.publish}
          </label>
          <div className={styles.actions}>
            <Button type="submit">{copy.save}</Button>
            {published ? (
              <Link href={`/courses/${course.slug}`} className={buttonStyles({ variant: 'secondary' })}>
                {copy.view}
              </Link>
            ) : null}
          </div>
        </form>

        <section className={styles.panel}>
          <h2 className={styles.sectionHeading}>
            {copy.sections} · {course.lessonCount} {copy.lessonCount}
          </h2>
          {course.sections.length === 0 ? <p className={styles.empty}>{copy.noSections}</p> : null}
          {course.sections.map((section) => (
            <div key={section.id} className={styles.sectionBlock}>
              <h3 className={styles.sectionTitle}>{section.title[language] || section.title.en || section.title.bn}</h3>
              {section.lessons.length === 0 ? <p className={styles.meta}>{copy.noLessons}</p> : null}
              <ol className={styles.lessonList}>
                {section.lessons.map((lesson) => (
                  <li key={lesson.id} className={styles.lessonRow}>
                    <span>{lesson.title[language] || lesson.title.en || lesson.title.bn}</span>
                    <span className={styles.meta}>
                      {copy[lesson.type]} · {lesson.bodyHtml ? 'HTML' : '—'}
                      {lesson.attachmentCount > 0 ? ` · ${lesson.attachmentCount}` : ''}
                    </span>
                  </li>
                ))}
              </ol>
              <details className={styles.disclosure}>
                <summary>{copy.addLesson}</summary>
                <form action={addLessonAction} className={styles.form}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <div className={styles.two}>
                    <Field id={`lesson-bn-${section.id}`} name="titleBn" label={copy.lessonTitleBn} maxLength={200} />
                    <Field id={`lesson-en-${section.id}`} name="titleEn" label={copy.lessonTitleEn} maxLength={200} />
                  </div>
                  <Select
                    id={`type-${section.id}`}
                    name="type"
                    label={copy.lessonType}
                    defaultValue="reading"
                    options={TYPES.map((type) => ({ value: type, label: copy[type] }))}
                  />
                  <Textarea id={`body-${section.id}`} name="bodyHtml" label={copy.body} defaultValue="" />
                  <Field id={`video-${section.id}`} name="videoUrl" label={copy.videoUrl} placeholder="https://" />
                  <fieldset className={styles.fieldset}>
                    <legend>{copy.attachmentName}</legend>
                    <Field id={`attachmentName-${section.id}`} name="attachmentName" label={copy.attachmentName} />
                    <Field id={`attachmentUrl-${section.id}`} name="attachmentUrl" label={copy.attachmentUrl} placeholder="https://" />
                    <div className={styles.two}>
                      <Select
                        id={`attachmentMime-${section.id}`}
                        name="attachmentMime"
                        label={copy.attachmentMime}
                        options={ATTACHMENT_MIME_TYPES.map((mime) => ({ value: mime, label: mime }))}
                      />
                      <Field id={`attachmentSize-${section.id}`} name="attachmentSize" type="number" min={1} label={copy.attachmentSize} />
                    </div>
                  </fieldset>
                  <Button type="submit">{copy.addLesson}</Button>
                </form>
              </details>
            </div>
          ))}

          <details className={styles.disclosure}>
            <summary>{copy.addSection}</summary>
            <form action={addSectionAction} className={styles.form}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="courseId" value={course.id} />
              <div className={styles.two}>
                <Field id="sectionTitleBn" name="titleBn" label={copy.sectionTitleBn} maxLength={200} />
                <Field id="sectionTitleEn" name="titleEn" label={copy.sectionTitleEn} maxLength={200} />
              </div>
              <Button type="submit">{copy.addSection}</Button>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}

type TextareaProps = {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
};

/** Long-form field used by descriptions and lesson bodies. */
function Textarea({ id, name, label, defaultValue }: TextareaProps) {
  return (
    <div className={styles.textareaField}>
      <label htmlFor={id} className={styles.textareaLabel}>
        {label}
      </label>
      <textarea id={id} name={name} defaultValue={defaultValue} rows={6} className={styles.textarea} maxLength={20000} />
    </div>
  );
}
