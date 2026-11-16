import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller.js';
import { COURSES_REPOSITORY, type CoursesRepository } from './courses.repository.js';
import { CoursesService } from './courses.service.js';
import { MongoCoursesRepository } from './mongo-courses.repository.js';
import { UnavailableCoursesRepository } from './unavailable-courses.repository.js';

@Module({
  controllers: [CoursesController],
  providers: [
    {
      provide: COURSES_REPOSITORY,
      useClass: process.env.MONGODB_URI ? MongoCoursesRepository : UnavailableCoursesRepository,
    },
    {
      provide: CoursesService,
      useFactory: (repository: CoursesRepository) => new CoursesService(repository),
      inject: [COURSES_REPOSITORY],
    },
  ],
})
export class CoursesModule {}
