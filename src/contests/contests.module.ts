import { Module } from '@nestjs/common';
import { ContestsService } from './contests.service';
import { ContestsController } from './contests.controller';
import { ContestsCronService } from './cron.service';

@Module({
  controllers: [ContestsController],
  providers: [ContestsService, ContestsCronService],
  exports: [ContestsService],
})
export class ContestsModule {}
