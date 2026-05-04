import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

type ValidationIssue = {
  field: string;
  errors: string[];
};

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationIssue[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const constraints = error.constraints
      ? Object.values(error.constraints)
      : [];
    const children = error.children?.length
      ? flattenValidationErrors(error.children, field)
      : [];

    return constraints.length
      ? [{ field, errors: constraints }, ...children]
      : children;
  });
}

export function createApiValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: false,
    },
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: flattenValidationErrors(errors),
      }),
  });
}
