import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContestsService } from './contests.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ContestsCronService {
  private readonly logger = new Logger(ContestsCronService.name);

  constructor(
    private contestsService: ContestsService,
    private supabaseService: SupabaseService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkExpiredContests() {
    const supabase = this.supabaseService.getClient();
    const now = new Date().toISOString();

    // Only resolve contests where the VOTING period is also over
    // i.e. voting_end_at <= now (or voting_end_at is null and end_at <= now)
    const { data: contests, error } = await supabase
      .from('contests')
      .select('id, title, end_at, voting_end_at, voting_duration_seconds')
      .eq('status', 'active');

    if (error) {
      this.logger.error(`Error querying contests: ${error.message}`);
      return;
    }

    const nowDate = new Date();
    const readyToResolve = (contests || []).filter((c: any) => {
      const endAt = new Date(c.end_at);
      // Compute voting_end_at: use stored value or fallback
      const votingEndAt = c.voting_end_at
        ? new Date(c.voting_end_at)
        : new Date(endAt.getTime() + (c.voting_duration_seconds ?? 300) * 1000);
      // Resolve only when the full voting window is over
      return nowDate >= votingEndAt;
    });

    if (readyToResolve.length > 0) {
      this.logger.log(`Found ${readyToResolve.length} contest(s) ready to resolve.`);
      for (const contest of readyToResolve) {
        try {
          this.logger.log(`Resolving: "${contest.title}" (${contest.id})`);
          const result = await this.contestsService.resolveContest(contest.id);
          this.logger.log(`Resolved ${contest.id}: ${JSON.stringify(result.winners)}`);
        } catch (e: any) {
          this.logger.error(`Failed to resolve ${contest.id}: ${e.message}`);
        }
      }
    }
  }
}
