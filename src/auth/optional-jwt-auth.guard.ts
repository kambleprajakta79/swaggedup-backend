import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Observable } from 'rxjs';
import { from, of } from 'rxjs';

/**
 * Attaches req.user when a valid JWT is present, but never blocks the request
 * when the token is missing/invalid. Used for guest-or-logged-in checkout.
 */
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const result = super.canActivate(context);
    if (typeof result === 'boolean') {
      return result;
    }
    if (result instanceof Promise) {
      return result.catch(() => true);
    }
    const obs = result as Observable<boolean>;
    return from(obs).toPromise().then(() => true).catch(() => true);
  }
}
