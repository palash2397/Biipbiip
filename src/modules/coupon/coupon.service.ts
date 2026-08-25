import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument } from './schema/coupon.schema';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { CouponStatus } from 'src/common/enums/coupon/coupon-status.enum';
import { ApiResponse } from 'src/helpers/ApiResponse';
import { Msg } from 'src/helpers/responseMsg';

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
  ) {}

  async createCoupon(dto: CreateCouponDto) {
    try {
      const existing = await this.couponModel.findOne({
        couponCode: dto.couponCode.toUpperCase(),
      });

      if (existing) {
        return new ApiResponse(400, {}, Msg.COUPON_ALREADY_EXISTS);
      }

      const coupon = await this.couponModel.create({
        ...dto,
        couponCode: dto.couponCode.toUpperCase(),
      });

      return new ApiResponse(201, { coupon }, Msg.COUPON_CREATED);
    } catch (error) {
      this.logger.error('Error creating coupon', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async getAllCoupons() {
    try {
      const coupons = await this.couponModel
        .find()
        .sort({ createdAt: -1 })
        .lean();

      if (!coupons || coupons.length === 0) {
        return new ApiResponse(404, {}, Msg.COUPONS_NOT_FOUND);
      }

      const formattedCoupons = coupons.map((c) => {
        const isExpired = new Date(c.expirationDate) < new Date();
        const displayStatus = isExpired ? 'EXPIRED' : c.status;
        return { ...c, displayStatus };
      });

      return new ApiResponse(
        200,
        { coupons: formattedCoupons },
        Msg.COUPON_FETCHED,
      );
    } catch (error) {
      this.logger.error('Error fetching coupons', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async getCouponStats() {
    try {
      const coupons = await this.couponModel.find().lean();

      let activePromotions = 0;
      let expiredOrInactive = 0;
      const totalCreated = coupons.length;

      const now = new Date();

      coupons.forEach((c) => {
        const isExpired = new Date(c.expirationDate) < now;
        if (c.status === CouponStatus.ACTIVE && !isExpired) {
          activePromotions++;
        } else {
          expiredOrInactive++;
        }
      });

      return new ApiResponse(
        200,
        {
          stats: {
            totalCreated,
            activePromotions,
            expiredOrInactive,
          },
        },
        Msg.COUPON_STATS_FETCHED,
      );
    } catch (error) {
      this.logger.error('Error fetching coupon stats', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async toggleStatus(id: string) {
    try {
      const coupon = await this.couponModel.findById(id);

      if (!coupon) {
        return new ApiResponse(404, {}, Msg.COUPON_NOT_FOUND);
      }

      coupon.status =
        coupon.status === CouponStatus.ACTIVE
          ? CouponStatus.INACTIVE
          : CouponStatus.ACTIVE;
      await coupon.save();

      return new ApiResponse(200, { coupon }, Msg.COUPON_UPDATED);
    } catch (error) {
      this.logger.error('Error updating coupon status', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async deleteCoupon(id: string) {
    try {
      const coupon = await this.couponModel.findByIdAndDelete(id);

      if (!coupon) {
        return new ApiResponse(404, {}, Msg.COUPON_NOT_FOUND);
      }

      return new ApiResponse(200, {}, Msg.COUPON_DELETED);
    } catch (error) {
      this.logger.error('Error deleting coupon', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async applyCoupon(dto: ApplyCouponDto) {
    try {
      const coupon = await this.couponModel.findOne({
        couponCode: dto.couponCode.toUpperCase(),
      });

      if (!coupon) {
        return new ApiResponse(404, {}, Msg.COUPON_NOT_FOUND);
      }

      if (coupon.status !== CouponStatus.ACTIVE) {
        return new ApiResponse(400, {}, Msg.COUPON_NOT_ACTIVE);
      }

      if (new Date(coupon.expirationDate) < new Date()) {
        return new ApiResponse(400, {}, Msg.COUPON_EXPIRED);
      }

      // In a full implementation, we might increment usedCount when the ride/rental is booked.
      // For now, we just validate and return the benefit details.

      return new ApiResponse(200, { coupon }, Msg.COUPON_APPLIED);
    } catch (error) {
      this.logger.error('Error applying coupon', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }
}
