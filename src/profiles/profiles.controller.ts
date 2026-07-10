import { Controller, Get, UseGuards, Req, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { SupabaseGuard } from '../supabase/supabase.guard';

@ApiTags('Profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get global user leaderboard sorted by ELO rating' })
  @ApiResponse({ status: 200, description: 'Leaderboard loaded successfully.' })
  async getLeaderboard() {
    return this.profilesService.getLeaderboard();
  }

  @Get('me')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the logged-in user profile' })
  @ApiResponse({ status: 200, description: 'Profile returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMe(@Req() req: any) {
    const userId = req.user.id;
    return this.profilesService.getMe(userId);
  }

  @Get('me/covers')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all covers submitted by the logged-in user with their contest ranking' })
  @ApiResponse({ status: 200, description: 'Covers returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMeCovers(@Req() req: any) {
    const userId = req.user.id;
    return this.profilesService.getMeCovers(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a public user profile by ID' })
  @ApiResponse({ status: 200, description: 'Profile returned successfully.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  async getById(@Param('id') id: string) {
    return this.profilesService.getMe(id);
  }

  @Get(':id/covers')
  @ApiOperation({ summary: 'Get all covers submitted by a user with their contest ranking' })
  @ApiResponse({ status: 200, description: 'Covers returned successfully.' })
  async getUserCovers(@Param('id') id: string) {
    return this.profilesService.getMeCovers(id);
  }
}
