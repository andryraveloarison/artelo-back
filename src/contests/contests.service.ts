import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { log } from 'node:console';

@Injectable()
export class ContestsService {
  private readonly logger = new Logger(ContestsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const supabase = this.supabaseService.getClient();

    // Fetch contests along with the count of cover submissions
    const { data: contests, error } = await supabase
      .from('contests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Error fetching contests: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    // For each contest, fetch the cover count
    const contestsWithCounts = await Promise.all(
      contests.map(async (contest) => {
        const { count, error: countError } = await supabase
          .from('covers')
          .select('*', { count: 'exact', head: true })
          .eq('contest_id', contest.id);

        return {
          ...contest,
          covers_count: countError ? 0 : count || 0,
        };
      }),
    );

    return contestsWithCounts;
  }

  async findOne(id: string) {
    const supabase = this.supabaseService.getClient();

    // Fetch contest detail
    const { data: contest, error } = await supabase
      .from('contests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    // Fetch covers (submissions) for this contest along with their vote stats and user profile
    const { data: covers, error: coversError } = await supabase
      .from('covers')
      .select('*')
      .eq('contest_id', id);

    const coversWithStats = (covers || []).map((cover: any) => {
      const votes = (cover.votes as { score: number }[]) || [];
      const voteCount = votes.length;
      const totalScore = votes.reduce((sum, v) => sum + v.score, 0);
      const averageScore =
        voteCount > 0 ? parseFloat((totalScore / voteCount).toFixed(2)) : 0;

      return {
        id: cover.id,
        user_id: cover.user_id,
        audio_url: cover.audio_url,
        created_at: cover.created_at,
        username: cover.profiles?.username || 'Unknown',
        elo: cover.profiles?.elo || 1200,
        avatar_url: cover.profiles?.avatar_url,
        average_score: averageScore,
        vote_count: voteCount,
      };
    });

    // Sort by average score descending, then by vote count descending
    coversWithStats.sort((a, b) => {
      if (b.average_score !== a.average_score) {
        return b.average_score - a.average_score;
      }
      return b.vote_count - a.vote_count;
    });

    return {
      ...contest,
      covers: coversWithStats,
    };
  }

  async create(dto: CreateContestDto, userId: string, token: string) {
    // We use the user-scoped client to perform the write so it respects the RLS insert policy
    const supabase = this.supabaseService.getClientForUser(token);

    const createdAt = new Date();
    const endAt = new Date(createdAt.getTime() + dto.duration_seconds * 1000);

    const { data, error } = await supabase
      .from('contests')
      .insert({
        title: dto.title,
        description: dto.description,
        reference_audio_url: dto.reference_audio_url,
        duration_seconds: dto.duration_seconds,
        status: 'active',
        end_at: endAt.toISOString(),
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating contest: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async update(id: string, dto: UpdateContestDto, token: string) {
    const userSupabase = this.supabaseService.getClientForUser(token);
    const systemSupabase = this.supabaseService.getClient();

    // 1. Fetch current contest
    const { data: contest, error: fetchError } = await systemSupabase
      .from('contests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.reference_audio_url !== undefined)
      updateData.reference_audio_url = dto.reference_audio_url;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (dto.duration_seconds !== undefined) {
      updateData.duration_seconds = dto.duration_seconds;
      // Recalculate end_at based on the original created_at timestamp
      const createdAt = new Date(contest.created_at);
      const endAt = new Date(createdAt.getTime() + dto.duration_seconds * 1000);
      updateData.end_at = endAt.toISOString();
    }

    const { data, error } = await userSupabase
      .from('contests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating contest: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async resolveContest(id: string) {
    const supabase = this.supabaseService.getClient();

    // 1. Fetch contest and verify it is active
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select('*')
      .eq('id', id)
      .single();

    if (contestError || !contest) {
      throw new NotFoundException(`Contest with ID ${id} not found`);
    }

    if (contest.status === 'completed') {
      throw new BadRequestException('Contest has already been resolved');
    }

    // 2. Fetch all covers with their votes
    const { data: covers, error: coversError } = await supabase
      .from('covers')
      .select('*, votes(score)')
      .eq('contest_id', id);

    if (coversError) {
      throw new BadRequestException(
        `Failed to fetch submissions: ${coversError.message}`,
      );
    }

    if (!covers || covers.length === 0) {
      // No participants - mark as completed with no winners
      const { error: updateError } = await supabase
        .from('contests')
        .update({ status: 'completed' })
        .eq('id', id);

      if (updateError) throw new BadRequestException(updateError.message);
      return {
        message:
          'Contest completed with 0 participants. No ELO points awarded.',
        contest_id: id,
        winners: [],
      };
    }

    // 3. Compute stats and rank covers
    const coversWithStats = covers.map((cover: any) => {
      const votes = (cover.votes as { score: number }[]) || [];
      const voteCount = votes.length;
      const totalScore = votes.reduce((sum, v) => sum + v.score, 0);
      const averageScore = voteCount > 0 ? totalScore / voteCount : 0;

      return {
        id: cover.id,
        user_id: cover.user_id,
        average_score: averageScore,
        vote_count: voteCount,
      };
    });

    // Sort: highest average score first, then most votes as tie-breaker
    coversWithStats.sort((a, b) => {
      if (b.average_score !== a.average_score) {
        return b.average_score - a.average_score;
      }
      return b.vote_count - a.vote_count;
    });

    // 4. Select top 3 winners
    const winner1 = coversWithStats[0]?.user_id || null;
    const winner2 = coversWithStats[1]?.user_id || null;
    const winner3 = coversWithStats[2]?.user_id || null;

    // Fixed Elo rewards: 1st (+30 ELO), 2nd (+20 ELO), 3rd (+10 ELO)
    const eloGain1 = winner1 ? 30 : 0;
    const eloGain2 = winner2 ? 20 : 0;
    const eloGain3 = winner3 ? 10 : 0;

    // 5. Call PostgreSQL RPC function to apply updates in a single transaction bypassing RLS
    const { error: rpcError } = await supabase.rpc('resolve_contest_results', {
      contest_id: id,
      w1: winner1,
      w2: winner2,
      w3: winner3,
      e1: eloGain1,
      e2: eloGain2,
      e3: eloGain3,
    });

    if (rpcError) {
      this.logger.error(`Error resolving contest via RPC: ${rpcError.message}`);
      throw new BadRequestException(
        `Database transaction failed: ${rpcError.message}`,
      );
    }

    // Retrieve winner details to return to the caller
    const winnersInfo = [];
    const winnerIds = [winner1, winner2, winner3].filter(Boolean);

    if (winnerIds.length > 0) {
      const { data: winnerProfiles } = await supabase
        .from('profiles')
        .select('id, username, elo')
        .in('id', winnerIds);

      if (winnerProfiles) {
        if (winner1) {
          const p = winnerProfiles.find((x) => x.id === winner1);
          if (p)
            winnersInfo.push({
              rank: 1,
              userId: winner1,
              username: p.username,
              newElo: p.elo,
              gain: 30,
            });
        }
        if (winner2) {
          const p = winnerProfiles.find((x) => x.id === winner2);
          if (p)
            winnersInfo.push({
              rank: 2,
              userId: winner2,
              username: p.username,
              newElo: p.elo,
              gain: 20,
            });
        }
        if (winner3) {
          const p = winnerProfiles.find((x) => x.id === winner3);
          if (p)
            winnersInfo.push({
              rank: 3,
              userId: winner3,
              username: p.username,
              newElo: p.elo,
              gain: 10,
            });
        }
      }
    }

    return {
      message: 'Contest resolved successfully',
      contest_id: id,
      winners: winnersInfo,
    };
  }
}
