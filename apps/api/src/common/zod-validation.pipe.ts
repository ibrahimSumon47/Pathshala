import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/** Validate a query, body or param value with a zod schema and one error shape. */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'validation_failed',
        message: 'The request is not valid.',
        details: result.error.issues.map((issue) => `${issue.path.join('.') || 'query'}: ${issue.message}`),
      });
    }
    return result.data;
  }
}
