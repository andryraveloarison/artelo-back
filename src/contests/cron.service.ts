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

    // Query active contests where end_at is less than or equal to now
    const { data: expiredContests, error } = await supabase
      .from('contests')
      .select('id, title')
      .eq('status', 'active')
      .lte('end_at', new Date().toISOString());

    if (error) {
      this.logger.error(`Error querying expired contests: ${error.message}`);
      return;
    }

    if (expiredContests && expiredContests.length > 0) {
      this.logger.log(`Found ${expiredContests.length} expired contest(s) to resolve.`);
      for (const contest of expiredContests) {
        try {
          this.logger.log(`Resolving contest: "${contest.title}" (ID: ${contest.id})`);
          const result = await this.contestsService.resolveContest(contest.id);
          this.logger.log(`Resolved contest ${contest.id} successfully: ${JSON.stringify(result.winners)}`);
        } catch (e: any) {
          this.logger.error(`Failed to resolve contest ${contest.id}: ${e.message}`);
        }
      }
    }
  }
}
