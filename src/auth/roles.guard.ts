import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Role hierarchy: ADMIN passes any check that includes a lower role.
 * e.g. @Roles('ADMIN', 'MANAGER') → ADMIN and MANAGER pass, CUSTOMER does not.
 */
const ROLE_HIERARCHY: Record<string, number> = {
  ADMIN: 3,
  MANAGER: 2,
  CUSTOMER: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access denied: insufficient permissions');
    }

    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const passes = requiredRoles.some(
      (role) => userLevel >= (ROLE_HIERARCHY[role] ?? 0),
    );
    if (!passes) {
      throw new ForbiddenException('Access denied: insufficient permissions');
    }
    return true;
  }
}
