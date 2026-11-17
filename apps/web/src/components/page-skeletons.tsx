import { Skeleton } from '@/components/ui/skeleton';
import styles from './page-skeletons.module.css';

/** One announced status per placeholder; the blocks themselves stay hidden from readers. */
function LoadingShell({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={styles.page}>
      <span className={styles.srOnly}>লোড হচ্ছে · Loading</span>
      {children}
    </div>
  );
}

/** Catalogue: filter card, result count and the three-column card grid. */
export function CatalogueSkeleton() {
  return (
    <LoadingShell>
      <div className="container">
        <Skeleton width="180px" height="2.2rem" />
        <div className={styles.ledeLines}>
          <Skeleton width="min(100%, 30rem)" height="0.9rem" />
          <Skeleton width="min(80%, 24rem)" height="0.9rem" />
        </div>
        <div className={styles.filterCard}>
          <Skeleton width="100%" height="2.6rem" />
          <div className={styles.filterRow}>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} height="2.6rem" shape="block" />
            ))}
          </div>
        </div>
        <Skeleton width="7rem" height="0.9rem" className={styles.count} />
        <div className={styles.cardGrid}>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className={styles.card}>
              <Skeleton width="35%" height="0.8rem" />
              <Skeleton width="85%" height="1.2rem" />
              <Skeleton width="100%" height="0.85rem" />
              <Skeleton width="60%" height="0.85rem" />
              <Skeleton width="4rem" height="0.9rem" />
            </div>
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}

/** Course detail: the reading column and the sticky buy panel. */
export function CourseDetailSkeleton() {
  return (
    <LoadingShell>
      <div className="container">
        <Skeleton width="12rem" height="0.85rem" />
        <Skeleton width="min(100%, 34rem)" height="2.4rem" className={styles.heading} />
        <Skeleton width="min(100%, 40rem)" height="1rem" />
        <div className={styles.detailGrid}>
          <div className={styles.detailMain}>
            <Skeleton width="100%" height="10rem" shape="block" />
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className={styles.section}>
                <Skeleton width="9rem" height="1.2rem" />
                <Skeleton width="100%" height="0.9rem" />
                <Skeleton width="92%" height="0.9rem" />
                <Skeleton width="70%" height="0.9rem" />
              </div>
            ))}
          </div>
          <div className={styles.aside}>
            <Skeleton width="6rem" height="1.8rem" />
            <Skeleton width="100%" height="2.8rem" shape="block" />
            <Skeleton width="100%" height="2.8rem" shape="block" />
            <Skeleton width="100%" height="0.85rem" />
            <Skeleton width="80%" height="0.85rem" />
          </div>
        </div>
      </div>
    </LoadingShell>
  );
}

/** Dashboard: account card on the left, learning panel on the right. */
export function DashboardSkeleton() {
  return (
    <LoadingShell>
      <div className="container">
        <Skeleton width="10rem" height="0.8rem" />
        <Skeleton width="16rem" height="2.2rem" className={styles.heading} />
        <div className={styles.dashboardGrid}>
          <div className={styles.card}>
            <Skeleton width="4rem" height="4rem" shape="circle" />
            <Skeleton width="70%" height="1.2rem" />
            <Skeleton width="90%" height="0.85rem" />
            <Skeleton width="55%" height="0.85rem" />
          </div>
          <div className={styles.card}>
            <Skeleton width="12rem" height="1.3rem" />
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} width="100%" height="3.2rem" shape="block" />
            ))}
          </div>
        </div>
      </div>
    </LoadingShell>
  );
}

/** Learning room: curriculum beside the lesson body. */
export function LessonSkeleton() {
  return (
    <LoadingShell>
      <div className="container">
        <Skeleton width="14rem" height="0.85rem" />
        <Skeleton width="min(100%, 28rem)" height="2.1rem" className={styles.heading} />
        <div className={styles.lessonGrid}>
          <div className={styles.card}>
            <Skeleton width="8rem" height="1.1rem" />
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} width="100%" height="1.6rem" />
            ))}
          </div>
          <div className={styles.lessonMain}>
            <Skeleton width="100%" height="14rem" shape="block" />
            <Skeleton width="100%" height="0.95rem" />
            <Skeleton width="94%" height="0.95rem" />
            <Skeleton width="100%" height="0.95rem" />
            <Skeleton width="60%" height="0.95rem" />
          </div>
        </div>
      </div>
    </LoadingShell>
  );
}

/** Cart: the course rows and the order summary panel. */
export function CartSkeleton() {
  return (
    <LoadingShell>
      <div className="container">
        <Skeleton width="14rem" height="2.2rem" />
        <Skeleton width="min(100%, 32rem)" height="0.9rem" className={styles.heading} />
        <div className={styles.cartGrid}>
          <div className={styles.cartRows}>
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton key={index} width="100%" height="5rem" shape="block" />
            ))}
          </div>
          <div className={styles.card}>
            <Skeleton width="8rem" height="1.2rem" />
            <Skeleton width="100%" height="2.6rem" />
            <Skeleton width="100%" height="0.9rem" />
            <Skeleton width="100%" height="2.8rem" shape="block" />
          </div>
        </div>
      </div>
    </LoadingShell>
  );
}
