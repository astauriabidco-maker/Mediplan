import {
  ArgumentsHost,
  Controller,
  ExecutionContext,
  Get,
  Logger,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_FILTER } from '@nestjs/core';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiExceptionFilter } from './filters/api-exception.filter';
import { createApiValidationPipe } from './pipes/api-validation.pipe';
import { LoginDto } from '../auth/dto/auth.dto';
import { TriggerPaymentDto } from '../payment/dto/payment.dto';

@Controller('security-test')
@UseGuards(ThrottlerGuard)
class SecurityTestController {
  @Get('limited')
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  limited(this: void) {
    return { ok: true };
  }
}

describe('API security primitives', () => {
  it('rejects extra DTO fields with a standardized validation response', async () => {
    const pipe = createApiValidationPipe();

    await expect(
      pipe.transform(
        {
          email: 'agent@example.com',
          password: 'valid-password',
          unexpected: true,
        },
        { type: 'body', metatype: LoginDto, data: '' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
  });

  it('keeps DTO numeric validation strict without implicit string conversion', async () => {
    const pipe = createApiValidationPipe();

    await expect(
      pipe.transform(
        {
          agentId: '42',
          amount: 100,
        },
        { type: 'body', metatype: TriggerPaymentDto, data: '' },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'VALIDATION_ERROR',
      },
    });
  });

  it('standardizes auth errors without exposing their original message', () => {
    const filter = new ApiExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          method: 'POST',
          url: '/api/auth/sso/segur/callback',
        }),
      }),
    };

    filter.catch(
      new UnauthorizedException('Aucun compte rattaché au RPPS 123456789'),
      host as ArgumentsHost,
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
      }),
    );
  });

  it('hides unhandled internal exception details', () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    const filter = new ApiExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          method: 'GET',
          url: '/api/payment/trigger',
        }),
      }),
    };

    filter.catch(new Error('database password leaked'), host as ArgumentsHost);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      }),
    );
    loggerSpy.mockRestore();
  });

  it('applies endpoint throttling to critical routes', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 100,
          },
        ]),
      ],
      controllers: [SecurityTestController],
      providers: [
        ThrottlerGuard,
        {
          provide: APP_FILTER,
          useClass: ApiExceptionFilter,
        },
      ],
    }).compile();

    const controller = moduleRef.get(SecurityTestController);
    const guard = moduleRef.get(ThrottlerGuard);
    await guard.onModuleInit();
    const response = { header: jest.fn() };
    const context = {
      getClass: () => SecurityTestController,
      getHandler: () => controller.limited,
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          headers: {},
        }),
        getResponse: () => response,
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 429,
    });
    await moduleRef.close();
  });
});
