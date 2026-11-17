import { connectToDatabase, Course, User } from '@pathshala/db';

export const dynamic = 'force-dynamic';

/** Public type-ahead used by the command palette; only published course titles leave. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 60);
  if (query.length < 2) return Response.json({ courses: [] });

  await connectToDatabase();
  // Escape user input so a stray bracket cannot turn into a regex error.
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const documents = await Course.find({
    status: 'published',
    $or: [{ 'title.bn': pattern }, { 'title.en': pattern }, { slug: pattern }],
  })
    .select('slug title pricePaisa instructor')
    .sort({ ratingAverage: -1, enrolmentCount: -1 })
    .limit(8)
    .lean();
  const instructors = await User.find({ _id: { $in: documents.map((document) => document.instructor) } })
    .select('name')
    .lean();
  const names = new Map(instructors.map((instructor) => [String(instructor._id), instructor.name]));

  return Response.json(
    {
      courses: documents.map((document) => ({
        slug: document.slug,
        title: document.title,
        pricePaisa: document.pricePaisa,
        instructor: names.get(String(document.instructor)) ?? '',
      })),
    },
    { headers: { 'cache-control': 'private, max-age=30' } },
  );
}
