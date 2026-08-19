import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

import { ApiResponse } from 'src/helpers/ApiResponse';
import { Msg } from 'src/helpers/responseMsg';

import { CarRentalBookingStatus } from 'src/common/enums/company/car-rental-booking-status.enum';

import {
  CarRentalBooking,
  CarRentalBookingDocument,
} from './schema/car-rental-booking.schema';
import {
  CompanyCar,
  CompanyCarDocument,
} from '../company/schema/company-car.schema';
import { User, UserDocument } from '../user/schema/user.schema';

import { CreateCarRentalBookingDto } from './dto/create-rental-booking.dto';

@Injectable()
export class CarRentalService {
  constructor(
    @InjectModel(CarRentalBooking.name)
    private carRentalBookingModel: Model<CarRentalBookingDocument>,
    @InjectModel(CompanyCar.name)
    private companyCarModel: Model<CompanyCarDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async createBooking(userId: string, dto: CreateCarRentalBookingDto) {
    try {
      const pickupDate = new Date(dto.pickupDate);
      const returnDate = new Date(dto.returnDate);

      if (pickupDate >= returnDate) {
        return new ApiResponse(400, {}, Msg.INVALID_RENTAL_DATES);
      }

      const car = await this.companyCarModel
        .findById(dto.carId)
        .populate({
          path: 'companyId',
          select:
            'companyName email phoneNumber city address isActive isVerified',
        })
        .lean();

      if (!car) {
        return new ApiResponse(404, {}, Msg.CAR_NOT_FOUND);
      }

      const company: any = car.companyId;

      if (!company) {
        return new ApiResponse(404, {}, Msg.COMPANY_NOT_FOUND);
      }

      if (!company.isActive || !company.isVerified) {
        return new ApiResponse(400, {}, Msg.COMPANY_NOT_AVAILABLE);
      }

      const existingBooking = await this.carRentalBookingModel.findOne({
        car: car._id,

        status: {
          $in: [
            CarRentalBookingStatus.PENDING,
            CarRentalBookingStatus.ACCEPTED,
          ],
        },

        pickupDate: {
          $lt: returnDate,
        },

        returnDate: {
          $gt: pickupDate,
        },
      });

      if (existingBooking) {
        return new ApiResponse(400, {}, Msg.CAR_NOT_AVAILABLE);
      }

      const millisecondsPerDay = 1000 * 60 * 60 * 24;

      const numberOfDays = Math.ceil(
        (returnDate.getTime() - pickupDate.getTime()) / millisecondsPerDay,
      );

      const totalAmount = numberOfDays * car.perDayCharge;

      const booking = await this.carRentalBookingModel.create({
        user: userId,

        company: company._id,

        car: car._id,

        pickupDate,

        returnDate,

        numberOfDays,

        pricePerDay: car.perDayCharge,

        totalAmount: Number(totalAmount.toFixed(2)),

        status: CarRentalBookingStatus.PENDING,
      });

      return new ApiResponse(
        201,
        {
          booking,
        },
        Msg.RENTAL_BOOKING_CREATED,
      );
    } catch (error) {
      console.log('Error while creating rental booking:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async myBookings(userId: string) {
    try {
      const bookings = await this.carRentalBookingModel
        .find({
          user: userId,
        })
        .populate({
          path: 'company',
          select: 'companyName email phoneNumber city address',
        })
        .populate({
          path: 'car',
          select:
            'carName vehicleBrand vehicleModel manufacturingYear color perDayCharge fuelType transmission noOfSeats noOfDoors mileage airConditioning bluetooth usb gps description vehiclePhotos',
        })
        .sort({
          createdAt: -1,
        })
        .lean();

      if (!bookings || bookings.length == 0) {
        return new ApiResponse(404, {}, Msg.RENTAL_BOOKING_NOT_FOUND);
      }

      return new ApiResponse(
        200,
        {
          bookings,
        },
        Msg.DATA_FETCHED,
      );
    } catch (error) {
      console.log('Error while fetching rental bookings:', error);

      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }
}
