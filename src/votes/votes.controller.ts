import { Controller, Post, Delete, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { VotesService } from './votes.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { SupabaseGuard } from '../supabase/supabase.guard';

@ApiTags('Votes')
@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post()
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit or update a vote on a cover submission (Authenticated)' })
  @ApiResponse({ status: 201, description: 'Vote submitted/updated successfully.' })
  @ApiResponse({ status: 400, description: 'Voting not allowed (User didn\'t upload cover, voted on own cover, or contest ended).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(@Body() createVoteDto: CreateVoteDto, @Req() req: any) {
    const voterId = req.user.id;
    const token = req.token;
    return this.votesService.create(createVoteDto, voterId, token);
  }

  @Delete(':id')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a previously submitted vote (Owner only)' })
  @ApiParam({ name: 'id', description: 'Vote UUID' })
  @ApiResponse({ status: 200, description: 'Vote deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Forbidden (Not the owner of the vote).' })
  @ApiResponse({ status: 404, description: 'Vote not found.' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const voterId = req.user.id;
    const token = req.token;
    return this.votesService.remove(id, voterId, token);
  }
}
