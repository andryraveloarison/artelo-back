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

    // Add covers_count for each user
    const withCovers = await Promise.all(
      (profiles || []).map(async (p) => {
        const { count } = await supabase
          .from('covers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', p.id);
        return { ...p, covers_count: count ?? 0 };
      }),
    );

    return withCovers;
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

  async getMeCovers(userId: string) {
    const supabase = this.supabaseService.getClient();

    // Fetch all covers by this user with contest info
    const { data: covers, error } = await supabase
      .from('covers')
      .select('id, audio_url, created_at, contest_id, contests(id, title, status, end_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to load covers: ${error.message}`);
    }

    // For each cover, compute rank within its contest
    const result = await Promise.all(
      (covers || []).map(async (cover: any) => {
        // Get all covers for this contest ordered by average vote score
        const { data: contestCovers } = await supabase
          .from('covers')
          .select('id, votes(score)')
          .eq('contest_id', cover.contest_id);

        const ranked = (contestCovers || [])
          .map((c: any) => {
            const votes: { score: number }[] = c.votes || [];
            const avg =
              votes.length > 0
                ? votes.reduce((s, v) => s + v.score, 0) / votes.length
                : 0;
            return { id: c.id, avg, voteCount: votes.length };
          })
          .sort((a, b) =>
            b.avg !== a.avg ? b.avg - a.avg : b.voteCount - a.voteCount,
          );

        const rank = ranked.findIndex((c) => c.id === cover.id) + 1;
        const total = ranked.length;

        // Compute effective contest status
        const contestStatus =
          cover.contests?.status === 'active' &&
          new Date(cover.contests?.end_at) < new Date()
            ? 'completed'
            : (cover.contests?.status ?? 'unknown');

        return {
          id: cover.id,
          audio_url: cover.audio_url,
          created_at: cover.created_at,
          contest_id: cover.contest_id,
          contest_title: cover.contests?.title ?? 'Concours inconnu',
          contest_status: contestStatus,
          rank,
          total,
        };
      }),
    );

    return result;
  }
}
