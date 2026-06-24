import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, Min, Max, IsUUID } from 'class-validator';

export class CreateVoteDto {
  @ApiProperty({ example: 'bcae9ebd-e8c1-4b13-9114-6ef26e0e0a5c', description: 'The UUID of the cover to vote on' })
  @IsNotEmpty()
  @IsUUID()
  cover_id: string;

  @ApiProperty({ example: 4, description: 'Score given to the cover (1 to 5 scale)', minimum: 1, maximum: 5 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;
}
