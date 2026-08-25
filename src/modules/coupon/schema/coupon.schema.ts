import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { BenefitType } from 'src/common/enums/coupon/benefit-type.enum';
import { CouponStatus } from 'src/common/enums/coupon/coupon-status.enum';

export type CouponDocument = HydratedDocument<Coupon>;

@Schema({
  timestamps: true,
})
export class Coupon {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  })
  couponCode: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  campaignTitle: string;

  @Prop({
    type: String,
    trim: true,
    default: null,
  })
  description?: string;

  @Prop({
    type: String,
    enum: BenefitType,
    required: true,
  })
  benefitType: BenefitType;

  @Prop({
    type: Number,
    required: true,
  })
  benefitValue: number;

  @Prop({
    type: Date,
    required: true,
  })
  expirationDate: Date;

  @Prop({
    type: String,
    enum: CouponStatus,
    default: CouponStatus.ACTIVE,
  })
  status: CouponStatus;

  @Prop({
    type: Number,
    default: 0,
  })
  usedCount: number;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
