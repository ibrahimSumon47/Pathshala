import type { OpenAPIObject } from './openapi.types.js';

/**
 * The public contract, written beside the controllers. It is built by hand rather than from
 * decorators so the serverless bundle stays small and has no swagger-ui runtime: three routes
 * are cheaper to describe than to generate, and `openapi.test.ts` checks every route and $ref.
 */
type JsonSchema = Record<string, unknown>;

const localizedText: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { bn: { type: 'string' }, en: { type: 'string' } },
};

const localizedList: JsonSchema = { type: 'array', items: localizedText };

const catalogCourse: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id', 'slug', 'title', 'subtitle', 'pricePaisa', 'language', 'level', 'ratingAverage',
    'ratingCount', 'enrolmentCount', 'categoryName', 'instructorName', 'thumbnailUrl', 'publishedAt',
  ],
  properties: {
    id: { type: 'string' },
    slug: { type: 'string' },
    title: localizedText,
    subtitle: { ...localizedText, nullable: true },
    pricePaisa: { type: 'integer', minimum: 0 },
    language: { type: 'string', enum: ['bn', 'en'] },
    level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
    ratingAverage: { type: 'number', minimum: 0, maximum: 5 },
    ratingCount: { type: 'integer', minimum: 0 },
    enrolmentCount: { type: 'integer', minimum: 0 },
    categoryName: { ...localizedText, nullable: true },
    instructorName: { type: 'string' },
    thumbnailUrl: { type: 'string', nullable: true },
    publishedAt: { type: 'string', nullable: true },
  },
};

const catalogPage: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['courses', 'total', 'page', 'pageCount'],
  properties: {
    courses: { type: 'array', items: { $ref: '#/components/schemas/CatalogCourse' } },
    total: { type: 'integer', minimum: 0 },
    page: { type: 'integer', minimum: 1 },
    pageCount: { type: 'integer', minimum: 0 },
  },
};

const courseDetail: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id', 'slug', 'title', 'subtitle', 'shortDescription', 'description', 'outcomes',
    'requirements', 'audience', 'faqs', 'instructor', 'sections', 'previewImageUrls',
    'promoVideoUrl', 'lessonCount', 'totalDurationMinutes', 'ratingBreakdown', 'related',
    'updatedAt', 'pricePaisa', 'language', 'level', 'ratingAverage', 'ratingCount',
    'enrolmentCount', 'categoryName', 'instructorName', 'thumbnailUrl', 'publishedAt',
  ],
  properties: {
    ...(catalogCourse.properties as JsonSchema),
    shortDescription: { ...localizedText, nullable: true },
    description: { ...localizedText, nullable: true },
    outcomes: localizedList,
    requirements: localizedList,
    audience: localizedList,
    faqs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'answer'],
        properties: { question: localizedText, answer: localizedText },
      },
    },
    instructor: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'bio', 'image'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        bio: localizedText,
        image: { type: 'string', nullable: true },
      },
    },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'lessons', 'durationMinutes'],
        properties: {
          id: { type: 'string' },
          title: localizedText,
          durationMinutes: { type: 'integer', minimum: 0 },
          lessons: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'title', 'type', 'bodyHtml', 'attachments', 'isPreview', 'videoUrl', 'durationMinutes'],
              properties: {
                id: { type: 'string' },
                title: localizedText,
                type: { type: 'string', enum: ['video', 'reading', 'quiz', 'live'] },
                bodyHtml: { type: 'string' },
                attachments: { type: 'array', items: { type: 'object' } },
                isPreview: { type: 'boolean' },
                videoUrl: { type: 'string', nullable: true },
                durationMinutes: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
    },
    previewImageUrls: { type: 'array', items: { type: 'string' } },
    promoVideoUrl: { type: 'string', nullable: true },
    lessonCount: { type: 'integer', minimum: 0 },
    totalDurationMinutes: { type: 'integer', minimum: 0 },
    ratingBreakdown: {
      type: 'object',
      additionalProperties: false,
      required: ['1', '2', '3', '4', '5'],
      properties: {
        '1': { type: 'integer', minimum: 0 },
        '2': { type: 'integer', minimum: 0 },
        '3': { type: 'integer', minimum: 0 },
        '4': { type: 'integer', minimum: 0 },
        '5': { type: 'integer', minimum: 0 },
      },
    },
    related: { type: 'array', items: { $ref: '#/components/schemas/CatalogCourse' } },
    updatedAt: { type: 'string' },
  },
};

const errorEnvelope: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'array', items: { type: 'string' } },
      },
    },
  },
};

const health: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'service', 'uptime'],
  properties: {
    status: { type: 'string', enum: ['ok'] },
    service: { type: 'string' },
    uptime: { type: 'integer', minimum: 0 },
  },
};

/** Every error uses one envelope, including the rate-limit guard's 429. */
const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
});

/** The document the API serves at /openapi.json. */
export function buildOpenApiDocument(): OpenAPIObject {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Pathshala API',
      version: '1.0',
      description: 'Public catalogue reads. Every error uses the same envelope.',
    },
    servers: [{ url: '/' }],
    paths: {
      '/health': {
        get: {
          operationId: 'health',
          tags: ['health'],
          summary: 'Liveness probe',
          responses: {
            '200': {
              description: 'The API is up and the process answered in time.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
            },
            '429': errorResponse('Too many requests from this address.'),
          },
        },
      },
      '/courses': {
        get: {
          operationId: 'listCourses',
          tags: ['courses'],
          summary: 'One page of published courses',
          parameters: [
            { name: 'q', in: 'query', required: false, description: 'Matches either script in the title or subtitle.', schema: { type: 'string', maxLength: 80 } },
            { name: 'category', in: 'query', required: false, description: 'Category slug.', schema: { type: 'string', maxLength: 80 } },
            { name: 'level', in: 'query', required: false, schema: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] } },
            { name: 'language', in: 'query', required: false, schema: { type: 'string', enum: ['bn', 'en'] } },
            { name: 'price', in: 'query', required: false, schema: { type: 'string', enum: ['all', 'free', 'paid'], default: 'all' } },
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500, default: 1 } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 24, default: 20 } },
          ],
          responses: {
            '200': {
              description: 'One page of published courses.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogPage' } } },
            },
            '400': errorResponse('The query did not match the allowed shape.'),
            '429': errorResponse('Too many requests from this address.'),
          },
        },
      },
      '/courses/{slug}': {
        get: {
          operationId: 'getCourse',
          tags: ['courses'],
          summary: 'One published course with its sections and lessons',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              description: 'Lowercase course slug.',
              schema: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
            },
          ],
          responses: {
            '200': {
              description: 'The published course, its sections and lessons.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['data'],
                    properties: { data: { $ref: '#/components/schemas/CourseDetail' } },
                  },
                },
              },
            },
            '400': errorResponse('The slug is not in the accepted shape.'),
            '404': errorResponse('No published course carries that slug.'),
            '429': errorResponse('Too many requests from this address.'),
          },
        },
      },
    },
    components: {
      schemas: {
        LocalizedText: localizedText,
        CatalogCourse: catalogCourse,
        CatalogPage: catalogPage,
        CourseDetail: courseDetail,
        ErrorEnvelope: errorEnvelope,
        Health: health,
      },
    },
  };
}

let document: OpenAPIObject | null = null;

/** Keep the document for the route that serves it. */
export function rememberOpenApiDocument(value: OpenAPIObject): void {
  document = value;
}

export function getOpenApiDocument(): OpenAPIObject {
  return document ?? buildOpenApiDocument();
}
