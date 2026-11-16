import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { RateLimitGuard } from './common/rate-limit.guard.js';
import { CoursesModule } from './courses/courses.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [CoursesModule],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
