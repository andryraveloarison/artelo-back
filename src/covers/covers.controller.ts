import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CoversService } from './covers.service';
import { CreateCreationDto } from './dto/create-creation.dto';
import { SupabaseGuard } from '../supabase/supabase.guard';

@ApiTags('Creations')
@Controller('creations')
export class CoversController {
  constructor(private readonly coversService: CoversService) {}

  @Post()
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new creation for an active session (Authenticated)' })
  @ApiResponse({ status: 201, description: 'Creation submitted successfully.' })
  @ApiResponse({ status: 400, description: 'Session closed, expired, or user already submitted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(@Body() createCreationDto: CreateCreationDto, @Req() req: any) {
    const userId = req.user.id;
    const token = req.token;
    return this.coversService.create(createCreationDto, userId, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get creation details' })
  @ApiParam({ name: 'id', description: 'Creation UUID' })
  @ApiResponse({ status: 200, description: 'Creation details returned successfully.' })
  @ApiResponse({ status: 404, description: 'Creation not found.' })
  async findOne(@Param('id') id: string) {
    return this.coversService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a submitted creation (Owner or Admin only)' })
  @ApiParam({ name: 'id', description: 'Creation UUID' })
  @ApiResponse({ status: 200, description: 'Creation deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not the owner or an admin).' })
  @ApiResponse({ status: 404, description: 'Creation not found.' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const userRole = req.userProfile?.role || 'user';
    const token = req.token;
    return this.coversService.remove(id, userId, userRole, token);
  }
}
