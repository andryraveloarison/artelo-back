import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCreationDto {
  @ApiProperty({ example: '8cfbdebd-b8c1-4b13-9114-6ef26e0e0a5c', description: 'The UUID of the session' })
  @IsNotEmpty()
  @IsUUID()
  contest_id: string;

  @ApiProperty({
    example: 'https://qoqgiivrsbqtsawrgogj.supabase.co/storage/v1/object/public/covers-audio/user_creation_1.mp3',
    description: 'URL of the submitted creation audio file (usually uploaded to storage first)',
  })
  @IsNotEmpty()
  @IsString()
  audio_url: string;
}
