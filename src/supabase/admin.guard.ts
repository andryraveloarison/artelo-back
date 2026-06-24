import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { SupabaseGuard } from './supabase.guard';

@Injectable()
export class AdminGuard extends SupabaseGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);
    if (!authenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const profile = request.userProfile;

    if (!profile || profile.role !== 'admin') {
      throw new ForbiddenException('Admin role is required to access this resource');
    }

    return true;
  }
}
