import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class SupabaseGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Authorization format must be Bearer <token>');
    }

    const token = parts[1];
    const supabase = this.supabaseService.getClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = user;
    request.token = token;

    // Fetch profile data (role, elo, username)
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, elo, role, avatar_url')
      .eq('id', user.id)
      .single();

    if (profile) {
      request.userProfile = profile;
    } else {
      // Fallback profile if the trigger hasn't finished or failed
      request.userProfile = {
        username: user.email?.split('@')[0] || 'User',
        elo: 1200,
        role: 'user',
        avatar_url: null,
      };
    }

    return true;
  }
}
