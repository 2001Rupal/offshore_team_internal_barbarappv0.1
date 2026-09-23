import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { FirebaseVerifyDto } from './dto/firebase-verify.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('customer/firebase-verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Firebase ID Token and authenticate/register customer' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully with CUSTOMER role JWT' })
  @ApiResponse({ status: 400, description: 'Invalid token or validation error' })
  @ApiResponse({ status: 401, description: 'Invalid or expired Firebase token' })
  @ApiResponse({ status: 403, description: 'Forbidden (owner accounts cannot use customer token)' })
  async verifyFirebaseCustomer(@Body() dto: FirebaseVerifyDto) {
    return this.authService.verifyFirebaseCustomer(dto);
  }

  @Post('customer/otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request mobile OTP for customer login/signup' })
  @ApiResponse({ status: 200, description: 'OTP dispatched successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or rate limit active' })
  async requestCustomerOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestCustomerOtp(dto);
  }

  @Post('customer/otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify mobile OTP and authenticate/register customer' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully with CUSTOMER role JWT' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 403, description: 'Forbidden (owner accounts cannot use customer OTP)' })
  async verifyCustomerOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyCustomerOtp(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new Shop Owner' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('customer/register')
  @ApiOperation({ summary: 'Register a new Customer' })
  @ApiResponse({ status: 201, description: 'Customer successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async registerCustomer(@Body() dto: CustomerRegisterDto) {
    return this.authService.registerCustomer(dto);
  }

  @Post('customer/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in as Customer' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated, returns JWT and user profile' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async loginCustomer(@Body() dto: CustomerLoginDto) {
    return this.authService.loginCustomer(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in as Shop Owner' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated, returns JWT and user profile' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user.id);
  }
}
