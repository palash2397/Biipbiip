import { Module } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';

import { User, UserSchema } from '../user/schema/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Driver, DriverSchema } from '../driver/schema/driver.schema';
import { Ride, RideSchema } from '../ride/schema/ride.schema';
import { Company, CompanySchema } from '../company/schema/company.schema';
import {
  CompanyCar,
  CompanyCarSchema,
} from '../company/schema/company-car.schema';
import {
  CarRentalBooking,
  CarRentalBookingSchema,
} from '../car-rental/schema/car-rental-booking.schema';

import { Rating, RatingSchema } from '../rating/schema/rating.schema';

@Module({
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Driver.name, schema: DriverSchema },
      { name: Ride.name, schema: RideSchema },
      { name: Company.name, schema: CompanySchema },
      { name: CompanyCar.name, schema: CompanyCarSchema },
      { name: CarRentalBooking.name, schema: CarRentalBookingSchema },
      { name: Rating.name, schema: RatingSchema },
    ]),
  ],
})
export class SuperAdminModule {}
