import { getImage } from '@pathshala/db';

type RouteProps = { params: Promise<{ id: string }> };

/**
 * Serve one uploaded course image. Ids never change content, so the response is cached
 * for a year; a replaced image gets a new id and the old URL is simply no longer used.
 */
export async function GET(_request: Request, { params }: RouteProps): Promise<Response> {
  const { id } = await params;
  const image = await getImage(id);
  if (!image) return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      'content-type': image.mimeType,
      'content-length': String(image.sizeBytes),
      // The stored mime type was read from the bytes, so it can be trusted here.
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
