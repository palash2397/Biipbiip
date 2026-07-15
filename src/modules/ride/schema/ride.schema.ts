import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { User } from 'src/modules/user/schema/user.schema';
import { Driver } from 'src/modules/driver/schema/driver.schema';
import { RideType } from 'src/modules/ride-type/schema/ride-type.schema';
import { RideStatus } from 'src/common/enums/ride/ride-enum';

export type RideDocument = HydratedDocument<Ride>;

@Schema({ timestamps: true })
export class Ride {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Driver.name,
    default: null,
  })
  driver?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: RideType.name,
    required: true,
  })
  rideType: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  pickupAddress: string;

  @Prop({ type: Number, required: true })
  pickupLatitude: number;

  @Prop({ type: Number, required: true })
  pickupLongitude: number;

  @Prop({ type: String, required: true, trim: true })
  destinationAddress: string;

  @Prop({ type: Number, required: true })
  destinationLatitude: number;

  @Prop({ type: Number, required: true })
  destinationLongitude: number;

  @Prop({ type: Number, required: true })
  distance: number;

  @Prop({ type: Number, required: true })
  estimatedTime: number;

  @Prop({ type: Number, required: true })
  estimatedFare: number;

  @Prop({
    type: String,
    enum: RideStatus,
    default: RideStatus.SEARCHING_DRIVER,
  })
  status: RideStatus;
}

export const RideSchema = SchemaFactory.createForClass(Ride);
