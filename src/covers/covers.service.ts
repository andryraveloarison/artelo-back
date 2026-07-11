import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCreationDto } from './dto/create-creation.dto';

@Injectable()
export class CoversService {
  private readonly logger = new Logger(CoversService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(dto: CreateCreationDto, userId: string, token: string) {
    const userSupabase = this.supabaseService.getClientForUser(token);
    const systemSupabase = this.supabaseService.getClient();

    // 1. Check if the contest is active and not expired
    const { data: contest, error: contestError } = await systemSupabase
      .from('contests')
      .select('*')
      .eq('id', dto.contest_id)
      .single();

    if (contestError || !contest) {
      throw new NotFoundException(`Contest with ID ${dto.contest_id} not found`);
    }

    if (contest.status !== 'active') {
      throw new BadRequestException('This contest is already closed');
    }

    const now = new Date();
    const endAt = new Date(contest.end_at);
    if (now > endAt) {
      throw new BadRequestException('This contest duration has expired');
    }

    // 2. Check if user already submitted a cover for this contest
    const { data: existingCover } = await systemSupabase
      .from('covers')
      .select('*')
      .eq('contest_id', dto.contest_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingCover) {
      throw new BadRequestException('You have already submitted a creation for this session. Only one submission is allowed.');
    }

    // 3. Submit cover
    const { data, error } = await userSupabase
      .from('covers')
      .insert({
        contest_id: dto.contest_id,
        user_id: userId,
        audio_url: dto.audio_url,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error submitting creation: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async findOne(id: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('covers')
      .select('*, profiles:user_id(username, elo, avatar_url), contests(title, status, end_at)')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Creation with ID ${id} not found`);
    }

    return data;
  }

  async remove(id: string, userId: string, userRole: string, token: string) {
    const userSupabase = this.supabaseService.getClientForUser(token);
    const systemSupabase = this.supabaseService.getClient();

    // 1. Fetch cover to check ownership
    const { data: cover, error: fetchError } = await systemSupabase
      .from('covers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !cover) {
      throw new NotFoundException(`Creation with ID ${id} not found`);
    }

    // 2. Check if owner or admin
    if (cover.user_id !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to delete this creation');
    }

    // 3. Delete creation
    const { error: deleteError } = await userSupabase
      .from('covers')
      .delete()
      .eq('id', id);

    if (deleteError) {
      this.logger.error(`Error deleting creation: ${deleteError.message}`);
      throw new BadRequestException(deleteError.message);
    }

    return { message: 'Creation deleted successfully' };
  }
}
