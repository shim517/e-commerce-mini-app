import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { createHash } from 'crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RefreshTokensService } from '../../refresh-tokens/refresh-tokens.service';

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(private readonly refreshTokensService: RefreshTokensService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        const req = context.switchToHttp().getRequest<{ cookies?: Record<string, string> }>();
        const rawToken = req.cookies?.refresh_token;
        if (!rawToken) return;

        const tokenHash = createHash('sha256').update(rawToken).digest('hex');
        // Fire-and-forget — must not block the response
        this.refreshTokensService
          .updateLastActivityByHash(tokenHash)
          .catch(() => undefined);
      }),
    );
  }
}
