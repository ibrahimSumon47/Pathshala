/** The small slice of the OpenAPI 3 document shape this API serves. */
export type OpenAPIObject = {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: { url: string }[];
  paths: Record<string, Record<string, unknown>>;
  components?: { schemas: Record<string, unknown> };
};
