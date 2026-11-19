import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from './openapi.js';

/**
 * The schema is what external tools and the audit run against, so it has to list the
 * routes and response bodies the controllers actually answer.
 */
describe('openapi document', () => {
  const document = buildOpenApiDocument();

  it('lists every public route and its query parameters', () => {
    expect(Object.keys(document.paths).sort()).toEqual(['/courses', '/courses/{slug}', '/health']);
    const parameters = document.paths['/courses']?.get as {
      parameters: { name: string; in: string }[];
    };
    expect(parameters.parameters.map((parameter) => parameter.name).sort()).toEqual([
      'category', 'language', 'level', 'limit', 'page', 'price', 'q',
    ]);
    expect(parameters.parameters.every((parameter) => parameter.in === 'query')).toBe(true);
  });

  it('describes each response body with a component schema', () => {
    const ref = (path: string, status: string) => {
      const operation = document.paths[path]?.get as {
        responses: Record<string, { content?: Record<string, { schema?: { $ref?: string } }> }>;
      };
      return operation.responses[status]?.content?.['application/json']?.schema?.$ref;
    };

    expect(ref('/health', '200')).toBe('#/components/schemas/Health');
    expect(ref('/courses', '200')).toBe('#/components/schemas/CatalogPage');
    expect(ref('/courses', '400')).toBe('#/components/schemas/ErrorEnvelope');
    expect(ref('/courses', '429')).toBe('#/components/schemas/ErrorEnvelope');
    expect(ref('/courses/{slug}', '400')).toBe('#/components/schemas/ErrorEnvelope');
    expect(ref('/courses/{slug}', '404')).toBe('#/components/schemas/ErrorEnvelope');
    expect(document.components?.schemas).toHaveProperty('CourseDetail');
    expect(document.components?.schemas).toHaveProperty('CatalogCourse');
  });

  it('keeps every $ref pointing at a schema it ships', () => {
    const schemas = document.components?.schemas ?? {};
    const refs = JSON.stringify(document).match(/#\/components\/schemas\/[A-Za-z]+/g) ?? [];
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(schemas).toHaveProperty(ref.replace('#/components/schemas/', ''));
    }
  });

  it('documents the slug parameter as required', () => {
    const operation = document.paths['/courses/{slug}']?.get as {
      parameters: { name: string; in: string; required: boolean }[];
    };
    expect(operation.parameters).toContainEqual(
      expect.objectContaining({ name: 'slug', in: 'path', required: true }),
    );
  });
});
