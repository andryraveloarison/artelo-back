import { Module, Global } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { SupabaseGuard } from './supabase.guard';
import { AdminGuard } from './admin.guard';

@Global()
@Module({
  providers: [SupabaseService, SupabaseGuard, AdminGuard],
  exports: [SupabaseService, SupabaseGuard, AdminGuard],
})
export class SupabaseModule {}
