import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { COURSES_REPOSITORY, type CoursesRepository } from './courses.repository';
import { CoursesService } from './courses.service';
import { MongoCoursesRepository } from './mongo-courses.repository';
import { UnavailableCoursesRepository } from './unavailable-courses.repository';

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
