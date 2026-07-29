import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from './schema/company.schema';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { LoginCompanyDto } from './dto/login-company.dto';
import { ApiResponse } from 'src/helpers/ApiResponse';
import { Msg } from 'src/helpers/responseMsg';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
  ) {}

  async register(dto: RegisterCompanyDto, files: Express.Multer.File[]) {
    try {
      const existingCompany = await this.companyModel.findOne({ email: dto.email });
      if (existingCompany) {
        return new ApiResponse(400, {}, Msg.COMPANY_EXISTS);
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const documentFiles = files?.map((file) => file.filename) || [];

      const company = new this.companyModel({
        ...dto,
        password: hashedPassword,
        documents: documentFiles,
      });

      await company.save();

      // Avoid returning the password
      const companyData = company.toObject();
      delete (companyData as any).password;

      return new ApiResponse(201, { company: companyData }, Msg.COMPANY_REGISTERED);
    } catch (error) {
      console.log('Error while registering company', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async login(dto: LoginCompanyDto) {
    try {
      const company = await this.companyModel.findOne({ email: dto.email }).select('+password');
      
      if (!company) {
        return new ApiResponse(404, {}, Msg.COMPANY_NOT_FOUND);
      }

      const isPasswordValid = await bcrypt.compare(dto.password, company.password);
      if (!isPasswordValid) {
        return new ApiResponse(400, {}, Msg.INVALID_CREDENTIALS);
      }

      const token = jwt.sign(
        {
          id: company._id.toString(),
          role: company.role,
          email: company.email,
        },
        process.env.JWT_SECRET!,
        {
          expiresIn: '10d',
        },
      );

      const baseUrl = process.env.BASE_URL;
      const formattedDocuments = company.documents.map(
        (doc) => `${baseUrl}/api/v1/uploads/company/${doc}`
      );

      const companyData = {
        _id: company._id,
        adminName: company.adminName,
        companyName: company.companyName,
        email: company.email,
        ownerName: company.ownerName,
        phoneNumber: company.phoneNumber,
        gstNumber: company.gstNumber,
        address: company.address,
        isActive: company.isActive,
        isVerified: company.isVerified,
        role: company.role,
        documents: formattedDocuments,
        token,
      };

      return new ApiResponse(200, { companyData }, Msg.LOGIN_SUCCESS);
    } catch (error) {
      console.log('Error while company login', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }
}
