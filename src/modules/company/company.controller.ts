import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { LoginCompanyDto } from './dto/login-company.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/middlewares/multer';

import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';

import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { UserRole } from 'src/common/enums/user/role.enum';

@ApiTags('Company')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('/register')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('documents', 10, multerConfig('company')))
  register(
    @Body() dto: RegisterCompanyDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.companyService.register(dto, files);
  }

  @Post('/login')
  login(@Body() dto: LoginCompanyDto) {
    return this.companyService.login(dto);
  }

  @Get('/my')
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard)
  myProfile(@Req() req: any) {
    // console.log(req.user);
    return this.companyService.myProfile(req.user?.id);
  }
}
