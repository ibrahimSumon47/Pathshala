import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { courseSlugSchema, coursesQuerySchema, type CoursesQuery } from './courses-query.schema.js';
import type { CatalogPage, CourseDetail } from './courses.repository.js';
import { CoursesService } from './courses.service.js';

@Controller('courses')
export class CoursesController {
  constructor(@Inject(CoursesService) private readonly courses: CoursesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(coursesQuerySchema)) query: CoursesQuery): Promise<CatalogPage> {
    return this.courses.listPublished(query);
  }

  @Get(':slug')
  async detail(
    @Param('slug', new ZodValidationPipe(courseSlugSchema)) slug: string,
  ): Promise<{ data: CourseDetail }> {
    const course = await this.courses.getBySlug(slug);
    if (!course) {
      throw new NotFoundException({ code: 'course_not_found', message: 'That course does not exist.' });
    }
    return { data: course };
  }
}
