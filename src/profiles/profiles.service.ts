import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProfilesService {
  constructor(private supabaseService: SupabaseService) {}

  async getLeaderboard() {
    const supabase = this.supabaseService.getClient();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, elo, avatar_url, role')
      .order('elo', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to load leaderboard: ${error.message}`);
    }

    return profiles;
  }

  async getMe(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new NotFoundException(`Profile with ID ${userId} not found`);
    }

    return profile;
  }
}
