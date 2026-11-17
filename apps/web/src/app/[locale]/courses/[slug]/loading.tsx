import { CourseDetailSkeleton } from '@/components/page-skeletons';

/** Keep the reading column and buy panel in place while the course loads. */
export default function CourseLoading() {
  return <CourseDetailSkeleton />;
}
