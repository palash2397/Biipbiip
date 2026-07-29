import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../user/schema/user.schema';
import { Driver, DriverDocument } from '../driver/schema/driver.schema';
import { Model } from 'mongoose';

import { ApiResponse } from 'src/helpers/ApiResponse';
import { Msg } from 'src/helpers/responseMsg';

import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

import { SuperAdminLoginDto } from '../auth/dto/superadmin-login.dto';
import { UserRole } from 'src/common/enums/user/role.enum';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Driver.name)
    private readonly driverModel: Model<DriverDocument>,
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

  async allDrivers() {
    try {
      const drivers = await this.driverModel
        .find()
        .populate('user', '-password -otp -otpExpireAt')
        .lean();

      if (!drivers || drivers.length == 0) {
        return new ApiResponse(404, {}, Msg.DATA_NOT_FOUND);
      }

      return new ApiResponse(
        200,
        {
          drivers,
        },
        Msg.DRIVERS_FETCHED,
      );
    } catch (error) {
      console.log('error while fetching drivers', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }
}
