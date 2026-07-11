import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabaseClient: SupabaseClient;
  private supabaseAdminClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_KEY');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      this.logger.error('Supabase URL or Key is missing from env!');
    }

    this.supabaseClient = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    this.supabaseAdminClient = createClient(url!, serviceRoleKey || key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (!serviceRoleKey) {
      this.logger.warn('SUPABASE_SERVICE_ROLE_KEY not set — RLS will apply to system operations!');
    }
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  getAdminClient(): SupabaseClient {
    return this.supabaseAdminClient;
  }

  getClientForUser(token: string): SupabaseClient {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_KEY');
    return createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
  }
}
