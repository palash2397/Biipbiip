import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { User } from 'src/modules/user/schema/user.schema';
import { Company } from 'src/modules/company/schema/company.schema';
import { CompanyCar } from 'src/modules/company/schema/company-car.schema';

import { CarRentalBookingStatus } from 'src/common/enums/company/car-rental-booking-status.enum';

export type CarRentalBookingDocument = HydratedDocument<CarRentalBooking>;

@Schema({
  timestamps: true,
})
export class CarRentalBooking {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Company.name,
    required: true,
  })
  company: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: CompanyCar.name,
    required: true,
  })
  car: Types.ObjectId;

  @Prop({
    required: true,
  })
  pickupDate: Date;

  @Prop({
    required: true,
  })
  returnDate: Date;

  @Prop({
    required: true,
    min: 1,
  })
  numberOfDays: number;

  @Prop({
    required: true,
  })
  pricePerDay: number;

  @Prop({
    required: true,
  })
  totalAmount: number;

  @Prop({
    type: String,
    enum: CarRentalBookingStatus,
    default: CarRentalBookingStatus.PENDING,
  })
  status: CarRentalBookingStatus;

  @Prop({
    default: null,
  })
  rejectionReason?: string;

  @Prop({
    default: null,
  })
  cancellationReason?: string;
}

export const CarRentalBookingSchema =
  SchemaFactory.createForClass(CarRentalBooking);
