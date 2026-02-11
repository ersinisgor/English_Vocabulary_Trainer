import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { map, Observable } from 'rxjs';

@Injectable()
export class SerializeInterceptor<T extends object> implements NestInterceptor {
  constructor(private readonly dto: Type<T>) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<T | T[] | null> {
    return next.handle().pipe(
      map((data: T | T[] | null) => {
        if (!data) return null;
        return plainToInstance(this.dto, data, {
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}
