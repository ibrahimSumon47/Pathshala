import { Types } from 'mongoose';
import { connectToDatabase } from './connection';
import { searchFilter } from './catalog';
import { Course } from './models/course';
import { Notification } from './models/notification';
import { SavedSearch } from './models/saved-search';
import type { CourseLevel } from './models/course';

export const MAX_SAVED_SEARCHES = 10;

export type SavedSearchInput = {
  query: string;
  level: CourseLevel | '';
  language: 'bn' | 'en' | '';
  maxPricePaisa: number | null;
};

export type SavedSearchRow = SavedSearchInput & {
  id: string;
  label: string;
  lastCheckedAt: string;
  lastMatchCount: number;
};

/** The query a saved search runs: published since the last check, with its own filters. */
export function savedSearchFilter(input: SavedSearchInput, since: Date): Record<string, unknown> {
  const filter: Record<string, unknown> = { status: 'published', publishedAt: { $gt: since } };
  const search = searchFilter(input.query);
  if (search) Object.assign(filter, search);
  if (input.level) filter.level = input.level;
  if (input.language) filter.language = input.language;
  if (input.maxPricePaisa !== null) filter.pricePaisa = { $lte: input.maxPricePaisa };
  return filter;
}

export async function listSavedSearches(userId: string): Promise<SavedSearchRow[]> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(userId)) return [];
  const rows = await SavedSearch.find({ user: userId }).sort({ createdAt: -1 }).limit(MAX_SAVED_SEARCHES).lean();
  return rows.map((row) => ({
    id: String(row._id),
    label: row.label,
    query: row.query,
    level: row.level,
    language: row.language,
    maxPricePaisa: row.maxPricePaisa,
    lastCheckedAt: row.lastCheckedAt.toISOString(),
    lastMatchCount: row.lastMatchCount,
  }));
}

/** Store one more search, up to ten per learner. */
export async function createSavedSearch(
  userId: string,
  input: SavedSearchInput & { label: string },
): Promise<'created' | 'limit' | 'invalid'> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(userId)) return 'invalid';
  const label = input.label.trim().slice(0, 80);
  const query = input.query.trim().slice(0, 80);
  if (!label || (!query && !input.level && !input.language && input.maxPricePaisa === null)) return 'invalid';
  const count = await SavedSearch.countDocuments({ user: userId });
  if (count >= MAX_SAVED_SEARCHES) return 'limit';
  await SavedSearch.create({
    user: userId,
    label,
    query,
    level: input.level,
    language: input.language,
    maxPricePaisa: input.maxPricePaisa,
    lastCheckedAt: new Date(),
    lastMatchCount: 0,
  });
  return 'created';
}

export async function deleteSavedSearch(userId: string, searchId: string): Promise<boolean> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(searchId)) return false;
  const result = await SavedSearch.deleteOne({ _id: searchId, user: userId });
  return result.deletedCount > 0;
}

/**
 * Re-run every saved search for one learner and put one inbox note per search with new
 * courses. The window is the time since the previous check, so a course is announced once.
 */
export async function checkSavedSearches(userId: string, now = new Date()): Promise<{ checked: number; newMatches: number }> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(userId)) return { checked: 0, newMatches: 0 };
  const searches = await SavedSearch.find({ user: userId }).limit(MAX_SAVED_SEARCHES);
  let newMatches = 0;
  for (const search of searches) {
    const since = search.lastCheckedAt;
    const count = await Course.countDocuments(
      savedSearchFilter(
        {
          query: search.query,
          level: search.level,
          language: search.language,
          maxPricePaisa: search.maxPricePaisa,
        },
        since,
      ),
    );
    if (count > 0) {
      newMatches += count;
      await Notification.create({
        user: userId,
        kind: 'system',
        title: { bn: 'নতুন কোর্স মিলেছে', en: 'New courses match your search' },
        body: {
          bn: `${search.label} — ${count}টি নতুন কোর্স প্রকাশিত হয়েছে।`,
          en: `${search.label} — ${count} new course${count === 1 ? '' : 's'} published.`,
        },
        href: '/courses',
      }).catch(() => undefined);
    }
    search.lastCheckedAt = now;
    search.lastMatchCount = count;
    await search.save();
  }
  return { checked: searches.length, newMatches };
}
