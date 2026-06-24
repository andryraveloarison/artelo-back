import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCoverDto {
  @ApiProperty({ example: '8cfbdebd-b8c1-4b13-9114-6ef26e0e0a5c', description: 'The UUID of the contest' })
  @IsNotEmpty()
  @IsUUID()
  contest_id: string;

  @ApiProperty({ 
    example: 'https://qoqgiivrsbqtsawrgogj.supabase.co/storage/v1/object/public/covers-audio/user_cover_1.mp3', 
    description: 'URL of the submitted cover audio file (usually uploaded to storage first)' 
  })
  @IsNotEmpty()
  @IsString()
  audio_url: string;
}
