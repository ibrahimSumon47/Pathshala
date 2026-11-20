import { ATTACHMENT_MIME_TYPES, listAttendance, listCategories, listCourseSessions } from '@pathshala/db';
import { notFound } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import { faqsToLines, listToLines } from '@/lib/course-content';
import { getStudioCourse } from '@/lib/studio';
import {
  addCoursePreviewImageAction,
  addLessonAction,
  addSectionAction,
  moveLessonAction,
  releaseSeatAction,
  removeCoursePreviewImageAction,
  scheduleSessionAction,
  updateCourseAction,
  updateCourseMediaAction,
  updateLessonAction,
  updateLiveCapacityAction,
} from '../actions';
import { studioCopy } from '../copy';
import { CoverField } from '../cover-field';
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
  const sessions = await listCourseSessions(course.id);
  const attendance = await Promise.all(sessions.map((session) => listAttendance(session.id)));

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
          <div className={styles.titleActions}>
            <Link href={`/studio/${course.id}/roster`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              {copy.roster}
            </Link>
            <Badge tone={published ? 'success' : 'neutral'}>{published ? copy.published : copy.draft}</Badge>
          </div>
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
            <Field
              id="shortDescriptionBn"
              name="shortDescriptionBn"
              label={copy.shortDescriptionBn}
              hint={copy.shortDescriptionHint}
              defaultValue={course.shortDescription.bn ?? ''}
              maxLength={300}
            />
            <Field
              id="shortDescriptionEn"
              name="shortDescriptionEn"
              label={copy.shortDescriptionEn}
              hint={copy.shortDescriptionHint}
              defaultValue={course.shortDescription.en ?? ''}
              maxLength={300}
            />
          </div>
          <div className={styles.two}>
            <Textarea id="descriptionBn" name="descriptionBn" label={copy.descriptionBn} hint={copy.longDescriptionHint} defaultValue={course.description.bn ?? ''} />
            <Textarea id="descriptionEn" name="descriptionEn" label={copy.descriptionEn} hint={copy.longDescriptionHint} defaultValue={course.description.en ?? ''} />
          </div>
          <div className={styles.two}>
            <Textarea
              id="outcomesBn"
              name="outcomesBn"
              label={copy.outcomesBn}
              hint={copy.outcomesHint}
              defaultValue={listToLines(course.outcomes, 'bn')}
            />
            <Textarea
              id="outcomesEn"
              name="outcomesEn"
              label={copy.outcomesEn}
              hint={copy.outcomesHint}
              defaultValue={listToLines(course.outcomes, 'en')}
            />
          </div>
          <div className={styles.two}>
            <Textarea
              id="requirementsBn"
              name="requirementsBn"
              label={copy.requirementsBn}
              hint={copy.requirementsHint}
              defaultValue={listToLines(course.requirements, 'bn')}
            />
            <Textarea
              id="requirementsEn"
              name="requirementsEn"
              label={copy.requirementsEn}
              hint={copy.requirementsHint}
              defaultValue={listToLines(course.requirements, 'en')}
            />
          </div>
          <div className={styles.two}>
            <Textarea
              id="audienceBn"
              name="audienceBn"
              label={copy.audienceBn}
              hint={copy.audienceHint}
              defaultValue={listToLines(course.audience, 'bn')}
            />
            <Textarea
              id="audienceEn"
              name="audienceEn"
              label={copy.audienceEn}
              hint={copy.audienceHint}
              defaultValue={listToLines(course.audience, 'en')}
            />
          </div>
          <div className={styles.two}>
            <Textarea
              id="faqBn"
              name="faqBn"
              label={copy.faqBn}
              hint={copy.faqHint}
              defaultValue={faqsToLines(course.faqs, 'bn')}
            />
            <Textarea
              id="faqEn"
              name="faqEn"
              label={copy.faqEn}
              hint={copy.faqHint}
              defaultValue={faqsToLines(course.faqs, 'en')}
            />
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
          <Field
            id="promoVideoUrl"
            name="promoVideoUrl"
            label={copy.promoVideo}
            hint={copy.promoVideoHint}
            defaultValue={course.promoVideoUrl}
            placeholder="https://"
            maxLength={500}
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

        <section className={styles.panel} aria-labelledby="course-media">
          <h2 className={styles.sectionHeading} id="course-media">
            {copy.media}
          </h2>
          <p className={styles.meta}>{copy.mediaHint}</p>

          <div className={styles.mediaGrid}>
            <figure className={styles.mediaItem}>
              {course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt={copy.coverImage}
                  className={styles.mediaImage}
                  width={640}
                  height={360}
                />
              ) : (
                <p className={styles.mediaPlaceholder}>{copy.noCover}</p>
              )}
              <figcaption className={styles.meta}>{copy.coverImage}</figcaption>
            </figure>
            {course.previewImageUrls.map((imageUrl) => (
              <figure key={imageUrl} className={styles.mediaItem}>
                <img
                  src={imageUrl}
                  alt={copy.previewAlt}
                  className={styles.mediaImage}
                  width={640}
                  height={360}
                  loading="lazy"
                />
                <figcaption className={styles.mediaCaption}>
                  <span className={styles.meta}>{copy.previewImage}</span>
                  <form action={removeCoursePreviewImageAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="imageUrl" value={imageUrl} />
                    <Button type="submit" variant="secondary" size="sm">
                      {copy.removeImage}
                    </Button>
                  </form>
                </figcaption>
              </figure>
            ))}
          </div>

          <form action={updateCourseMediaAction} className={styles.form} encType="multipart/form-data">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="courseId" value={course.id} />
            <CoverField label={copy.coverImage} hint={copy.coverHint} />
            {course.thumbnailUrl ? (
              <label className={styles.check}>
                <input type="checkbox" name="removeCover" /> {copy.removeCover}
              </label>
            ) : null}
            <div className={styles.actions}>
              <Button type="submit">{copy.uploadCover}</Button>
            </div>
          </form>

          {course.previewImageUrls.length < 3 ? (
            <form action={addCoursePreviewImageAction} className={styles.form} encType="multipart/form-data">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="courseId" value={course.id} />
              <div className={styles.fileField}>
                <label className={styles.fileLabel} htmlFor="course-preview-image">
                  {copy.previewImage}
                </label>
                <input
                  id="course-preview-image"
                  name="preview"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className={styles.file}
                />
                <p className={styles.meta}>{copy.coverHint}</p>
              </div>
              <div className={styles.actions}>
                <Button type="submit" variant="secondary">
                  {copy.addPreview}
                </Button>
              </div>
            </form>
          ) : (
            <p className={styles.meta}>{copy.previewLimit}</p>
          )}
        </section>

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
                {section.lessons.map((lesson, index) => {
                  const title = lesson.title[language] || lesson.title.en || lesson.title.bn;
                  return (
                    <li key={lesson.id} className={styles.lessonRow}>
                      <div className={styles.lessonMain}>
                        {lesson.type === 'quiz' ? (
                          <Link href={`/studio/${course.id}/lesson/${lesson.id}`} className={styles.lessonLink}>
                            {title} →
                          </Link>
                        ) : (
                          <span>{title}</span>
                        )}
                        <span className={styles.meta}>
                          {copy[lesson.type]} · {lesson.durationMinutes} {copy.duration}
                          {lesson.isPreview ? ' · preview' : ''}
                          {lesson.attachmentCount > 0 ? ` · ${lesson.attachmentCount}` : ''}
                        </span>
                        <details className={styles.lessonDisclosure}>
                          <summary>{copy.lessonMedia}</summary>
                          <form action={updateLessonAction} className={styles.lessonMediaForm}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="courseId" value={course.id} />
                            <input type="hidden" name="lessonId" value={lesson.id} />
                            <Field
                              id={`lesson-video-${lesson.id}`}
                              name="videoUrl"
                              label={copy.videoUrl}
                              hint={copy.videoHint}
                              defaultValue={lesson.videoUrl}
                              placeholder="https://"
                              maxLength={500}
                            />
                            <label className={styles.check}>
                              <input type="checkbox" name="isPreview" defaultChecked={lesson.isPreview} />{' '}
                              {copy.lessonPreview}
                            </label>
                            <div>
                              <Button type="submit" variant="secondary" size="sm">
                                {copy.saveLesson}
                              </Button>
                            </div>
                          </form>
                        </details>
                      </div>
                      <div className={styles.lessonActions}>
                        <form action={moveLessonAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="lessonId" value={lesson.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            disabled={index === 0}
                            aria-label={`${copy.moveUp}: ${title}`}
                            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                          >
                            {copy.moveUp}
                          </button>
                        </form>
                        <form action={moveLessonAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="lessonId" value={lesson.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            disabled={index === section.lessons.length - 1}
                            aria-label={`${copy.moveDown}: ${title}`}
                            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                          >
                            {copy.moveDown}
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
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
                  <div className={styles.two}>
                    <Field id={`video-${section.id}`} name="videoUrl" label={copy.videoUrl} placeholder="https://" />
                    <Field
                      id={`duration-${section.id}`}
                      name="durationMinutes"
                      type="number"
                      min={0}
                      max={600}
                      defaultValue={10}
                      label={copy.duration}
                    />
                  </div>
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

        <section className={styles.panel}>
          <h2 className={styles.sectionHeading}>{language === 'en' ? 'Live classes' : 'লাইভ ক্লাস'}</h2>
          {sessions.length === 0 ? <p className={styles.empty}>{language === 'en' ? 'No live classes scheduled.' : 'কোনো লাইভ ক্লাস নেই।'}</p> : null}
          {sessions.map((session, index) => (
            <div key={session.id} className={styles.sectionBlock}>
              <h3 className={styles.sectionTitle}>{session.title[language] || session.title.en || session.title.bn}</h3>
              <p className={styles.meta}>
                {new Date(session.startsAt).toLocaleString(locale)} · {session.durationMinutes} min · {session.status} ·{' '}
                {language === 'en' ? 'attending' : 'উপস্থিত'}: {attendance[index]?.length ?? 0}
                {session.capacity > 0 ? `/${session.capacity}` : ''}
                {session.waitlistCount > 0
                  ? ` · ${session.waitlistCount} ${language === 'en' ? 'waiting' : 'অপেক্ষায়'}`
                  : ''}
              </p>
              {attendance[index]?.length ? (
                <ul className={styles.attendanceList}>
                  {attendance[index].map((row) => (
                    <li key={row.studentId}>
                      <span>{row.studentName}</span>
                      <details className={styles.releaseConfirm}>
                        <summary className={styles.releaseSummary}>
                          {language === 'en' ? 'Release seat' : 'আসন ছাড়ান'}
                        </summary>
                        <div className={styles.releaseBody}>
                          <p className={styles.meta}>
                            {language === 'en'
                              ? `Free ${row.studentName}'s seat? The next learner in line is told when a seat is open.`
                              : `${row.studentName}-এর আসনটি ছাড়বেন? আসন খালি হলে অপেক্ষার তালিকার পরের শিক্ষার্থীকে জানানো হবে।`}
                          </p>
                          <form action={releaseSeatAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="courseId" value={course.id} />
                            <input type="hidden" name="sessionId" value={session.id} />
                            <input type="hidden" name="studentId" value={row.studentId} />
                            <Button type="submit" variant="secondary" size="sm">
                              {language === 'en' ? 'Confirm release' : 'ছাড়া নিশ্চিত করুন'}
                            </Button>
                          </form>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              ) : null}
              <form action={updateLiveCapacityAction} className={styles.capacityForm}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="sessionId" value={session.id} />
                <Field
                  id={`live-seats-${session.id}`}
                  name="capacity"
                  type="number"
                  min={0}
                  max={1000}
                  defaultValue={session.capacity}
                  label={language === 'en' ? 'Seats (0 = no cap)' : 'আসন (০ = সীমা নেই)'}
                />
                <Button type="submit" variant="secondary" size="sm">
                  {language === 'en' ? 'Update seats' : 'আসন হালনাগাদ করুন'}
                </Button>
              </form>
              <p className={styles.meta}>
                {language === 'en'
                  ? 'Raising the seats notifies the first learners in the waitlist.'
                  : 'আসন বাড়ালে অপেক্ষার তালিকার প্রথম শিক্ষার্থীদের জানানো হবে।'}
              </p>
              <Link href={`/live/${course.slug}`} className={styles.lessonLink} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                {language === 'en' ? 'Open live room →' : 'লাইভ রুম খুলুন →'}
              </Link>
            </div>
          ))}
          <details className={styles.disclosure}>
            <summary>{language === 'en' ? 'Schedule a live class' : 'লাইভ ক্লাস যোগ করুন'}</summary>
            <form action={scheduleSessionAction} className={styles.form}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="courseId" value={course.id} />
              <div className={styles.two}>
                <Field id="live-title-bn" name="titleBn" label={copy.titleBn} maxLength={160} />
                <Field id="live-title-en" name="titleEn" label={copy.titleEn} maxLength={160} />
              </div>
              <div className={styles.three}>
                <Field id="live-starts" name="startsAt" type="datetime-local" label={language === 'en' ? 'Starts (server local time)' : 'শুরু (সার্ভারের স্থানীয় সময়)'} required />
                <Field id="live-duration" name="durationMinutes" type="number" min={15} max={240} defaultValue={60} label={language === 'en' ? 'Minutes' : 'মিনিট'} />
                <Field
                  id="live-capacity"
                  name="capacity"
                  type="number"
                  min={0}
                  max={1000}
                  defaultValue={0}
                  label={language === 'en' ? 'Seats (0 = no cap)' : 'আসন (০ = সীমা নেই)'}
                />
              </div>
              <div className={styles.two}>
                <Textarea id="live-description-bn" name="descriptionBn" label={copy.descriptionBn} defaultValue="" />
                <Textarea id="live-description-en" name="descriptionEn" label={copy.descriptionEn} defaultValue="" />
              </div>
              <Button type="submit">{language === 'en' ? 'Schedule class' : 'ক্লাস নির্ধারণ করুন'}</Button>
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
  hint?: string;
  defaultValue: string;
  rows?: number;
};

/** Long-form field used by descriptions and lesson bodies. */
function Textarea({ id, name, label, hint, defaultValue, rows = 4 }: TextareaProps) {
  return (
    <div className={styles.textareaField}>
      <label htmlFor={id} className={styles.textareaLabel}>
        {label}
      </label>
      {hint ? (
        <p className={styles.meta} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      <textarea
        id={id}
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className={styles.textarea}
        maxLength={20000}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
    </div>
  );
}
