import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsString } from 'class-validator';
import { VerificationStatus } from 'src/common/enums/driver/verification-status.enum';

export class DriverStatusDto {
  @ApiProperty()
  @IsMongoId()
  driverId: string;
  @ApiProperty({
    enum: VerificationStatus,
  })
  @IsEnum(VerificationStatus)
  status: VerificationStatus;
  @ApiProperty()
  @IsString()
  reason: string;
}
