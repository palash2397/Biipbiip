import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../user/schema/user.schema';
import { Driver, DriverDocument } from '../driver/schema/driver.schema';
import { Company, CompanyDocument } from '../company/schema/company.schema';
import {
  CompanyCar,
  CompanyCarDocument,
} from '../company/schema/company-car.schema';
import { Ride, RideDocument } from '../ride/schema/ride.schema';
import {
  CarRentalBooking,
  CarRentalBookingDocument,
} from '../car-rental/schema/car-rental-booking.schema';

import { Rating, RatingDocument } from '../rating/schema/rating.schema';
import { RatingFor } from 'src/common/enums/driver/rating-enum';

import { RideStatus } from 'src/common/enums/ride/ride-enum';
import { CarRentalBookingStatus } from 'src/common/enums/company/car-rental-booking-status.enum';

import { ApiResponse } from 'src/helpers/ApiResponse';
import { Msg } from 'src/helpers/responseMsg';

import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

import { SuperAdminLoginDto } from '../auth/dto/superadmin-login.dto';
import { DriverStatusDto } from './dto/driver-status.dto';

import { UserRole } from 'src/common/enums/user/role.enum';
import { VerificationStatus } from 'src/common/enums/driver/verification-status.enum';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Driver.name)
    private readonly driverModel: Model<DriverDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(CompanyCar.name)
    private readonly companyCarModel: Model<CompanyCarDocument>,
    @InjectModel(Ride.name)
    private readonly rideModel: Model<RideDocument>,
    @InjectModel(CarRentalBooking.name)
    private readonly carRentalBookingModel: Model<CarRentalBookingDocument>,

    @InjectModel(Rating.name)
    private readonly ratingModel: Model<RatingDocument>,
  ) {}

  async login(dto: SuperAdminLoginDto) {
    try {
      const user = await this.userModel.findOne({
        email: dto.email,
        roles: { $in: [UserRole.SUPERADMIN] },
      });
      console.log('user', user);

      if (!user) {
        return new ApiResponse(400, {}, Msg.USER_NOT_FOUND);
      }

      if (!user.password) {
        return new ApiResponse(400, {}, Msg.INVALID_CREDENTIALS);
      }

      const isPasswordValid = await bcrypt.compare(dto.password, user.password);

      if (!isPasswordValid) {
        return new ApiResponse(400, {}, Msg.INVALID_CREDENTIALS);
      }

      const token = jwt.sign(
        {
          id: user._id.toString(),
          roles: user.roles,
          email: user.email,
        },
        process.env.JWT_SECRET!,
        {
          expiresIn: '10d',
        },
      );

      user.avatar = user.avatar
        ? `${process.env.BASE_URL}/api/v1/uploads/profile/${user.avatar}`
        : process.env.DEFAULT_IMAGE;

      const userData = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        countryCode: user.countryCode,
        phoneNumber: user.phoneNumber,
        email: user.email,
        roles: user.roles,
        avatar: user.avatar,
        gender: user.gender,
        token,
      };

      return new ApiResponse(
        200,
        {
          userData,
        },
        Msg.LOGIN_SUCCESS,
      );
    } catch (error) {
      console.log('error while super admin login', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async dashboardStats() {
    try {
      const [
        totalCompanies,
        verifiedCompanies,
        pendingVerificationCompanies,
        totalCarsListed,
        totalDrivers,
        totalRides,
        completedRides,
        completedCarRentals,
      ] = await Promise.all([
        this.companyModel.countDocuments(),
        this.companyModel.countDocuments({ isVerified: true }),
        this.companyModel.countDocuments({ isVerified: false }),
        this.companyCarModel.countDocuments(),
        this.driverModel.countDocuments(),
        this.rideModel.countDocuments({ status: RideStatus.COMPLETED }),
        this.rideModel
          .find({ status: RideStatus.COMPLETED })
          .select('currentFare')
          .lean(),
        this.carRentalBookingModel
          .find({ status: CarRentalBookingStatus.COMPLETED })
          .select('totalAmount')
          .lean(),
      ]);

      const rideRevenue = completedRides.reduce(
        (sum: number, ride: any) => sum + (ride.currentFare || 0),
        0,
      );
      const rentalRevenue = completedCarRentals.reduce(
        (sum: number, booking: any) => sum + (booking.totalAmount || 0),
        0,
      );
      const platformRevenue = rideRevenue + rentalRevenue;

      return new ApiResponse(
        200,
        {
          totalCompanies,
          verifiedCompanies,
          pendingVerificationCompanies,
          totalCarsListed,
          totalDrivers,
          totalRides,
          platformRevenue,
        },
        Msg.DASHBOARD_STATS_FETCHED,
      );
    } catch (error) {
      console.log('error while fetching dashboard stats', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async allDrivers() {
    try {
      const drivers = await this.driverModel
        .find()
        .populate('user', '-password -otp -otpExpireAt')
        .lean();

      if (!drivers || drivers.length == 0) {
        return new ApiResponse(404, {}, Msg.DATA_NOT_FOUND);
      }

      const baseUrl = process.env.BASE_URL;
      const formattedDrivers = drivers.map((driver: any) => {
        if (driver.user && driver.user.avatar) {
          driver.user.avatar = `${baseUrl}/api/v1/uploads/profile/${driver.user.avatar}`;
        }

        const formatDriverImage = (fileName?: string) =>
          fileName ? `${baseUrl}/api/v1/uploads/driver/${fileName}` : undefined;

        driver.nationalIdFront = formatDriverImage(driver.nationalIdFront);
        driver.nationalIdBack = formatDriverImage(driver.nationalIdBack);
        driver.driverLicenseFront = formatDriverImage(
          driver.driverLicenseFront,
        );
        driver.driverLicenseBack = formatDriverImage(driver.driverLicenseBack);
        driver.vehicleRegistrationFront = formatDriverImage(
          driver.vehicleRegistrationFront,
        );
        driver.vehicleRegistrationBack = formatDriverImage(
          driver.vehicleRegistrationBack,
        );

        if (driver.vehiclePhotos && driver.vehiclePhotos.length > 0) {
          driver.vehiclePhotos = driver.vehiclePhotos.map(
            (photo: string) => formatDriverImage(photo) as string,
          );
        }

        return driver;
      });

      return new ApiResponse(
        200,
        {
          drivers: formattedDrivers,
        },
        Msg.DRIVERS_FETCHED,
      );
    } catch (error) {
      console.log('error while fetching drivers', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async driverById(driverId: string) {
    try {
      const driver = await this.driverModel
        .findById(driverId)
        .populate('user', '-password -otp -otpExpireAt')
        .lean();

      if (!driver) {
        return new ApiResponse(404, {}, Msg.DRIVER_NOT_FOUND);
      }

      const baseUrl = process.env.BASE_URL;
      if (driver.user && (driver.user as any).avatar) {
        (driver.user as any).avatar =
          `${baseUrl}/api/v1/uploads/profile/${(driver.user as any).avatar}`;
      }

      const formatDriverImage = (fileName?: string) =>
        fileName ? `${baseUrl}/api/v1/uploads/driver/${fileName}` : undefined;

      driver.nationalIdFront = formatDriverImage(driver.nationalIdFront);
      driver.nationalIdBack = formatDriverImage(driver.nationalIdBack);
      driver.driverLicenseFront = formatDriverImage(driver.driverLicenseFront);
      driver.driverLicenseBack = formatDriverImage(driver.driverLicenseBack);
      driver.vehicleRegistrationFront = formatDriverImage(
        driver.vehicleRegistrationFront,
      );
      driver.vehicleRegistrationBack = formatDriverImage(
        driver.vehicleRegistrationBack,
      );

      if (driver.vehiclePhotos && driver.vehiclePhotos.length > 0) {
        driver.vehiclePhotos = driver.vehiclePhotos.map(
          (photo: string) => formatDriverImage(photo) as string,
        );
      }

      const rides = await this.rideModel
        .find({ driver: driverId })
        .populate('user', 'firstName lastName phoneNumber')
        .sort({ createdAt: -1 })
        .lean();

      let totalDistance = 0;
      let totalRevenue = 0;
      let totalRides = 0;

      const rideHistory = rides.map((ride: any) => {
        if (ride.status === RideStatus.COMPLETED) {
          totalRides++;
          totalDistance += ride.distance || 0;
          totalRevenue += ride.currentFare || 0;
        }

        const tip = 0;
        const currentFare = ride.currentFare || 0;

        return {
          rideId: ride._id,
          date: ride.createdAt,
          customerName: ride.user
            ? `${ride.user.firstName} ${ride.user.lastName}`
            : 'Unknown',
          phone: ride.user?.phoneNumber || 'Unknown',
          pickup: ride.pickupAddress,
          dropPoint: ride.destinationAddress,
          distance: ride.distance || 0,
          fare: currentFare,
          tip: tip,
          totalPrice: currentFare + tip,
          status: ride.status,
        };
      });

      const stats = {
        totalRides,
        totalDistance,
        totalRevenue,
      };

      return new ApiResponse(
        200,
        {
          driver,
          stats,
          rideHistory,
        },
        Msg.DRIVERS_FETCHED,
      );
    } catch (error) {
      console.log('error while fetching driver by id', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async approveOrRejectDriver(dto: DriverStatusDto) {
    try {
      const { driverId, status } = dto;

      // const user = await this.userModel.findById(driverId);
      // if (!user) {
      //   return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      // }

      const driver = await this.driverModel.findOne({ _id: driverId });
      if (!driver) {
        return new ApiResponse(404, {}, Msg.DRIVER_NOT_FOUND);
      }

      driver.verificationStatus = status;
      await driver.save();

      return new ApiResponse(
        200,
        { driver },
        status === VerificationStatus.APPROVED
          ? Msg.DRIVER_VERIFIED
          : Msg.DRIVER_REJECTED,
      );
    } catch (error) {
      console.log(`error while changing the driver status`, error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async changeCompanyStatus(id: string) {
    try {
      const company = await this.companyModel.findOne({ _id: id });
      if (!company) {
        return new ApiResponse(404, {}, Msg.COMPANY_NOT_FOUND);
      }

      company.isVerified = company.isVerified ? false : true;
      await company.save();

      return new ApiResponse(
        200,
        { company },
        company.isVerified
          ? 'Company verified successfully'
          : 'Company unverified successfully',
      );
    } catch (error) {
      console.log(`error while changing the company status`, error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async allCompanies() {
    try {
      const company = await this.companyModel
        .find({})
        .select('-password')
        .lean();
      if (!company || company.length == 0) {
        return new ApiResponse(404, {}, Msg.DATA_NOT_FOUND);
      }

      const baseUrl = process.env.BASE_URL || '';
      const formattedCompanies = company.map((company: any) => {
        if (company.documents && company.documents.length > 0) {
          company.documents = company.documents.map(
            (doc: string) => `${baseUrl}/api/v1/uploads/company/${doc}`,
          );
        }
        return company;
      });

      return new ApiResponse(
        200,
        { companies: formattedCompanies },
        Msg.DATA_FETCHED,
      );
    } catch (error) {
      console.log(`error while fetching companies`, error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async allCompaniesCars() {
    try {
      const data = await this.companyCarModel
        .find({})
        .populate('companyId', 'adminName companyName email')
        .lean();

      if (!data || data.length == 0) {
        return new ApiResponse(404, {}, Msg.DATA_NOT_FOUND);
      }

      const formattedCompaniesCar = data.map((car: any) => {
        if (car.vehiclePhotos && car.vehiclePhotos.length > 0) {
          car.vehiclePhotos = car.vehiclePhotos.map(
            (photo: string) =>
              `${process.env.BASE_URL}/api/v1/uploads/company-car/${photo}`,
          );
        }
        return car;
      });

      return new ApiResponse(
        200,
        { companiesCar: formattedCompaniesCar },
        Msg.CARS_FETCHED,
      );
    } catch (error) {
      console.log(`error while getting companies car`, error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async carVerificaton(id: string) {
    try {
      const car = await this.companyCarModel.findOne({ _id: id });
      if (!car) {
        return new ApiResponse(404, {}, Msg.DATA_NOT_FOUND);
      }

      car.isVerified = car.isVerified ? false : true;
      await car.save();

      return new ApiResponse(
        200,
        {},
        car.isVerified ? Msg.CAR_VERIFIED : Msg.CAR_UNVERIFIED,
      );
    } catch (error) {
      console.log(`error while car verification`, error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async verifiedDriverRidesStats() {
    try {
      const drivers = await this.driverModel
        .find({ verificationStatus: VerificationStatus.APPROVED })
        .populate('user', 'firstName lastName email phoneNumber')
        .lean();

      if (!drivers || drivers.length === 0) {
        return new ApiResponse(404, {}, Msg.DATA_NOT_FOUND);
      }

      const driverIds = drivers.map((d: any) => d._id);

      const rideStats = await this.rideModel.aggregate([
        {
          $match: {
            driver: { $in: driverIds },
            status: RideStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: '$driver',
            totalRides: { $sum: 1 },
            totalDistance: { $sum: '$distance' },
          },
        },
      ]);

      const rideStatsMap = new Map();
      rideStats.forEach((stat) => {
        rideStatsMap.set(stat._id.toString(), {
          totalRides: stat.totalRides,
          totalDistance: stat.totalDistance,
        });
      });

      const formattedDrivers = drivers.map((driver: any) => {
        const stats = rideStatsMap.get(driver._id.toString()) || {
          totalRides: 0,
          totalDistance: 0,
        };
        return {
          id: driver._id,
          firstName: driver.user?.firstName || '',
          lastName: driver.user?.lastName || '',
          email: driver.user?.email || '',
          phoneNumber: driver.user?.phoneNumber || '',
          vehicleName: driver.vehicleName || '',
          vehicleRegistrationNumber: driver.vehicleRegistrationNumber || '',
          totalRides: stats.totalRides,
          totalDistance: stats.totalDistance,
        };
      });

      return new ApiResponse(
        200,
        { driverRides: formattedDrivers },
        Msg.DATA_FETCHED,
      );
    } catch (error) {
      console.log('error while fetching verified driver rides stats', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }
  async getAllDriverRatings() {
    try {
      const ratings = await this.ratingModel
        .find({ ratingFor: RatingFor.DRIVER })
        .populate('givenBy', 'firstName lastName')
        .populate('givenTo', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean();

      if (!ratings || ratings.length === 0) {
        return new ApiResponse(404, {}, Msg.DATA_NOT_FOUND);
      }

      const formattedRatings = ratings.map((rating: any, index: number) => ({
        no: index + 1,
        id: rating._id,
        riderName: rating.givenBy
          ? `${rating.givenBy.firstName} ${rating.givenBy.lastName}`
          : 'Unknown',
        driverName: rating.givenTo
          ? `${rating.givenTo.firstName} ${rating.givenTo.lastName}`
          : 'Unknown',
        rating: rating.rating,
        dateAndTime: rating.createdAt,
        comments: rating.review || '-',
      }));

      return new ApiResponse(
        200,
        { ratings: formattedRatings },
        Msg.DATA_FETCHED,
      );
    } catch (error) {
      console.log('error while fetching driver ratings', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async deleteDriverRating(id: string) {
    try {
      const rating = await this.ratingModel.findByIdAndDelete(id);

      if (!rating) {
        return new ApiResponse(404, {}, Msg.DATA_NOT_FOUND);
      }

      return new ApiResponse(200, {}, 'Rating deleted successfully');
    } catch (error) {
      console.log('error while deleting driver rating', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async allUsers() {
    try {
      const users = await this.userModel
        .find({ roles: { $in: [UserRole.USER] } })
        .select('-password -otp -otpExpireAt')
        .lean();

      if (!users || users.length === 0) {
        return new ApiResponse(404, {}, Msg.DATA_NOT_FOUND);
      }

      const baseUrl = process.env.BASE_URL;
      const formattedUsers = users.map((user: any) => {
        user.avatar = user.avatar
          ? `${baseUrl}/api/v1/uploads/profile/${user.avatar}`
          : `${process.env.DEFAULT_IMAGE}`;
        return user;
      });

      return new ApiResponse(200, { users: formattedUsers }, Msg.DATA_FETCHED);
    } catch (error) {
      console.log('error while fetching users', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async allRentalBookings() {
    try {
      const bookings = await this.carRentalBookingModel
        .find({})
        .populate('user', 'firstName lastName phoneNumber email')
        .populate('car', 'carName')
        .sort({ createdAt: -1 })
        .lean();

      if (!bookings || bookings.length === 0) {
        return new ApiResponse(404, {}, Msg.DATA_NOT_FOUND);
      }

      const formattedBookings = bookings.map((booking: any) => ({
        id: booking._id,
        customerName: booking.user
          ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim()
          : 'Unknown',
        carName: booking.car?.carName || 'Unknown',
        phone: booking.user?.phoneNumber || 'Unknown',
        email: booking.user?.email || 'Unknown',
        days: booking.numberOfDays,
        rentalDates: {
          start: booking.pickupDate,
          end: booking.returnDate,
        },
        amount: booking.totalAmount,
        status: booking.status,
        createdAt: booking.createdAt,
      }));

      return new ApiResponse(
        200,
        { rentalBookings: formattedBookings },
        Msg.DATA_FETCHED,
      );
    } catch (error) {
      console.log('error while fetching rental bookings', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }
}
