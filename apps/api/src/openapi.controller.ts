import { Controller, Get } from '@nestjs/common';
import type { OpenAPIObject } from './openapi.types.js';
import { getOpenApiDocument } from './openapi.js';

/** Serves the contract that describes this API, kept beside the controllers it documents. */
@Controller()
export class OpenApiController {
  @Get('openapi.json')
  read(): OpenAPIObject {
    return getOpenApiDocument();
  }
}
