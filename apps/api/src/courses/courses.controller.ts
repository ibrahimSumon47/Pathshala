import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { coursesQuerySchema, type CoursesQuery } from './courses-query.schema.js';
import type { PublishedCourse } from './courses.repository.js';
import { CoursesService } from './courses.service.js';

@Controller('courses')
export class CoursesController {
  constructor(@Inject(CoursesService) private readonly courses: CoursesService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(coursesQuerySchema)) query: CoursesQuery,
  ): Promise<{ data: PublishedCourse[] }> {
    return { data: await this.courses.listPublished(query.limit) };
  }
}
