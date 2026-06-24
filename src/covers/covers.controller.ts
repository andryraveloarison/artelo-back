import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CoversService } from './covers.service';
import { CreateCoverDto } from './dto/create-cover.dto';
import { SupabaseGuard } from '../supabase/supabase.guard';

@ApiTags('Covers')
@Controller('covers')
export class CoversController {
  constructor(private readonly coversService: CoversService) {}

  @Post()
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new cover audio for an active contest (Authenticated)' })
  @ApiResponse({ status: 201, description: 'Cover submitted successfully.' })
  @ApiResponse({ status: 400, description: 'Contest closed, expired, or user already submitted a cover.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(@Body() createCoverDto: CreateCoverDto, @Req() req: any) {
    const userId = req.user.id;
    const token = req.token;
    return this.coversService.create(createCoverDto, userId, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cover details' })
  @ApiParam({ name: 'id', description: 'Cover UUID' })
  @ApiResponse({ status: 200, description: 'Cover details returned successfully.' })
  @ApiResponse({ status: 404, description: 'Cover not found.' })
  async findOne(@Param('id') id: string) {
    return this.coversService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a submitted cover (Owner or Admin only)' })
  @ApiParam({ name: 'id', description: 'Cover UUID' })
  @ApiResponse({ status: 200, description: 'Cover deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not the owner or an admin).' })
  @ApiResponse({ status: 404, description: 'Cover not found.' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const userRole = req.userProfile?.role || 'user';
    const token = req.token;
    return this.coversService.remove(id, userId, userRole, token);
  }
}
