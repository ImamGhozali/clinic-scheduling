import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { IdempotencyKey } from '../entities/idempotency-key.entity';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyKeyRepository: Repository<IdempotencyKey>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Only apply to POST requests with Idempotency-Key header
    if (request.method !== 'POST') {
      return next.handle();
    }

    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) {
      return next.handle();
    }

    const tenantId = request.tenant?.id;
    if (!tenantId) {
      return next.handle();
    }

    const requestPath = request.route?.path || request.url;

    // Check if this idempotency key was already used
    const existingKey = await this.idempotencyKeyRepository.findOne({
      where: {
        tenantId,
        idempotencyKey,
      },
    });

    if (existingKey) {
      // Check if key is expired
      if (existingKey.expiresAt < new Date()) {
        // Delete expired key and continue with new request
        await this.idempotencyKeyRepository.delete(existingKey.id);
      } else {
        // Return cached response
        response.status(existingKey.responseStatus || 200);
        return of(existingKey.responseBody);
      }
    }

    // Clean up expired keys periodically (1% chance per request)
    if (Math.random() < 0.01) {
      await this.idempotencyKeyRepository.delete({
        expiresAt: LessThan(new Date()),
      });
    }

    // Process the request and store the result
    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.idempotencyKeyRepository.save({
            tenantId,
            idempotencyKey,
            requestPath,
            requestMethod: request.method,
            responseStatus: response.statusCode,
            responseBody: data,
          });
        } catch (error) {
          // Ignore errors in storing idempotency key (e.g., duplicate key constraint)
          // This can happen in race conditions, which is acceptable
        }
      }),
    );
  }
}

