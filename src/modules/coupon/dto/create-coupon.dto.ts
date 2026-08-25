import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BenefitType } from 'src/common/enums/coupon/benefit-type.enum';

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME100' })
  @IsString()
  @IsNotEmpty()
  couponCode: string;

  @ApiProperty({ example: 'New User Welcome Bonus' })
  @IsString()
  @IsNotEmpty()
  campaignTitle: string;

  @ApiProperty({ example: 'Get flat 100 cashback on first ride', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: BenefitType, example: BenefitType.CASHBACK })
  @IsEnum(BenefitType)
  @IsNotEmpty()
  benefitType: BenefitType;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsNotEmpty()
  benefitValue: number;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  @IsNotEmpty()
  expirationDate: string;
}
