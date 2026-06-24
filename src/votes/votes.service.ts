import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateVoteDto } from './dto/create-vote.dto';

@Injectable()
export class VotesService {
  private readonly logger = new Logger(VotesService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(dto: CreateVoteDto, voterId: string, token: string) {
    const userSupabase = this.supabaseService.getClientForUser(token);
    const systemSupabase = this.supabaseService.getClient();

    // 1. Fetch target cover details to get contest_id and owner_id
    const { data: targetCover, error: coverError } = await systemSupabase
      .from('covers')
      .select('*, contests(status, end_at)')
      .eq('id', dto.cover_id)
      .single();

    if (coverError || !targetCover) {
      throw new NotFoundException(`Cover submission with ID ${dto.cover_id} not found`);
    }

    const contestId = targetCover.contest_id;
    const coverOwnerId = targetCover.user_id;
    const contest = targetCover.contests;

    // 2. Ensure the contest is active
    if (contest.status !== 'active') {
      throw new BadRequestException('This contest has already ended');
    }

    const now = new Date();
    const endAt = new Date(contest.end_at);
    if (now > endAt) {
      throw new BadRequestException('Voting has closed as the contest duration has expired');
    }

    // 3. Prevent voting on own cover
    if (coverOwnerId === voterId) {
      throw new BadRequestException('You cannot vote for your own cover');
    }

    // 4. Ensure voter has uploaded a cover for the SAME contest
    const { data: voterCover, error: voterCoverError } = await systemSupabase
      .from('covers')
      .select('id')
      .eq('contest_id', contestId)
      .eq('user_id', voterId)
      .maybeSingle();

    if (voterCoverError || !voterCover) {
      throw new BadRequestException('Only users who have submitted their own cover to this contest are eligible to vote');
    }

    // 5. Check if vote already exists for this (cover, voter) pair to upsert or throw
    const { data: existingVote } = await systemSupabase
      .from('votes')
      .select('*')
      .eq('cover_id', dto.cover_id)
      .eq('voter_id', voterId)
      .maybeSingle();

    if (existingVote) {
      // Upsert: Let's update the existing vote
      const { data: updatedVote, error: updateError } = await userSupabase
        .from('votes')
        .update({ score: dto.score })
        .eq('id', existingVote.id)
        .select()
        .single();

      if (updateError) {
        this.logger.error(`Error updating vote: ${updateError.message}`);
        throw new BadRequestException(updateError.message);
      }
      return { ...updatedVote, message: 'Vote updated successfully' };
    }

    // 6. Insert new vote
    const { data: newVote, error: insertError } = await userSupabase
      .from('votes')
      .insert({
        cover_id: dto.cover_id,
        voter_id: voterId,
        score: dto.score,
      })
      .select()
      .single();

    if (insertError) {
      this.logger.error(`Error inserting vote: ${insertError.message}`);
      throw new BadRequestException(insertError.message);
    }

    return { ...newVote, message: 'Vote recorded successfully' };
  }

  async remove(id: string, voterId: string, token: string) {
    const userSupabase = this.supabaseService.getClientForUser(token);
    const systemSupabase = this.supabaseService.getClient();

    // Fetch vote to verify ownership
    const { data: vote, error: fetchError } = await systemSupabase
      .from('votes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !vote) {
      throw new NotFoundException(`Vote with ID ${id} not found`);
    }

    if (vote.voter_id !== voterId) {
      throw new BadRequestException('You do not have permission to delete this vote');
    }

    const { error: deleteError } = await userSupabase
      .from('votes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new BadRequestException(deleteError.message);
    }

    return { message: 'Vote deleted successfully' };
  }
}
