import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ContestsService } from './contests.service';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { AdminGuard } from '../supabase/admin.guard';

@ApiTags('Contests')
@Controller('contests')
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all contests with participant counts' })
  @ApiResponse({
    status: 200,
    description: 'List of contests returned successfully.',
  })
  async findAll() {
    return this.contestsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get contest details and submissions (covers) ranked by votes',
  })
  @ApiParam({ name: 'id', description: 'Contest UUID' })
  @ApiResponse({ status: 200, description: 'Contest details and submissions.' })
  @ApiResponse({ status: 404, description: 'Contest not found.' })
  async findOne(@Param('id') id: string) {
    return this.contestsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new cover contest (Admin only)' })
  @ApiResponse({ status: 201, description: 'Contest created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin role required).' })
  async create(@Body() createContestDto: CreateContestDto, @Req() req: any) {
    const userId = req.user.id;
    const token = req.token;
    return this.contestsService.create(createContestDto, userId, token);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a contest details / duration (Admin only)' })
  @ApiParam({ name: 'id', description: 'Contest UUID' })
  @ApiResponse({ status: 200, description: 'Contest updated successfully.' })
  @ApiResponse({ status: 404, description: 'Contest not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async update(
    @Param('id') id: string,
    @Body() updateContestDto: UpdateContestDto,
    @Req() req: any,
  ) {
    const token = req.token;
    return this.contestsService.update(id, updateContestDto, token);
  }

  @Post(':id/resolve')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Manually resolve an active contest, calculate final rankings, and award ELO to top 3 (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Contest UUID' })
  @ApiResponse({
    status: 200,
    description: 'Contest resolved and ELO points distributed.',
  })
  @ApiResponse({
    status: 400,
    description: 'Contest already completed or transaction failed.',
  })
  @ApiResponse({ status: 404, description: 'Contest not found.' })
  async resolveContest(@Param('id') id: string) {
    return this.contestsService.resolveContest(id);
  }
}
