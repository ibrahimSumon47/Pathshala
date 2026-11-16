import { redirect } from 'next/navigation';

/** The gateway has no public home; the dashboard is the product. */
export default function HomePage() {
  redirect('/dashboard');
}
