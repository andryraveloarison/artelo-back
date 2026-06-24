import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';

export class CreateContestDto {
  @ApiProperty({ example: 'Bohemian Rhapsody Cover Contest', description: 'The title of the contest' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ 
    example: 'Submit your best vocal cover of Queen\'s Bohemian Rhapsody. Winner gets ELO points!', 
    description: 'Description of the contest rules and guidelines',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    example: 'https://qoqgiivrsbqtsawrgogj.supabase.co/storage/v1/object/public/covers-audio/reference_bohemian.mp3', 
    description: 'URL of the original audio file that users will cover' 
  })
  @IsNotEmpty()
  @IsString()
  reference_audio_url: string;

  @ApiProperty({ 
    example: 86400, 
    description: 'Adjustable contest duration in seconds (e.g. 86400 for 24h, 3600 for 1h)', 
    default: 86400 
  })
  @IsNotEmpty()
  @IsInt()
  @Min(60)
  duration_seconds: number;
}
