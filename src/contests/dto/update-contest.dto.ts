import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, IsOptional, IsIn } from 'class-validator';

export class UpdateContestDto {
  @ApiProperty({ example: 'Updated Title', description: 'The title of the contest', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Updated description', description: 'Contest description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://example.com/updated_audio.mp3', description: 'URL of the original audio file', required: false })
  @IsOptional()
  @IsString()
  reference_audio_url?: string;

  @ApiProperty({ example: 172800, description: 'Adjustable contest duration in seconds (e.g. 172800 for 48h)', required: false })
  @IsOptional()
  @IsInt()
  @Min(60)
  duration_seconds?: number;

  @ApiProperty({ example: 'active', description: 'Status of the contest', enum: ['active', 'completed'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'completed'])
  status?: string;
}
