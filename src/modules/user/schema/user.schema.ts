import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from 'src/common/enums/user/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
})
export class User {
  @Prop({
    type: String,
    trim: true,
  })
  firstName?: string;

  @Prop({
    type: String,
    trim: true,
  })
  lastName?: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  phoneNumber: string;

  @Prop({
    type: String,
    trim: true,
    lowercase: true,
  })
  email?: string;

  @Prop({
    type: [String],
    enum: UserRole,
    default: [],
  })
  roles: UserRole[];

  @Prop({
    type: Boolean,
    default: false,
  })
  isVerified: boolean;

  @Prop({
    type: String,
    default: '',
  })
  otp?: string;

  @Prop({
    type: Date,
    default: '',
  })
  otpExpireAt?: Date;

  @Prop({
    type: Boolean,
    default: false,
  })
  isProfileCompleted: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
