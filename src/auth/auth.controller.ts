import { Controller, Post, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { EmailOnlyDto } from './dto/email-only.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse, ApiConflictResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login with email and password (admin or customer)' })
  @ApiOkResponse({ description: 'Returns JWT access token' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @Throttle({ default: { ttl: 60_000, limit: 10 } }) // 10 login attempts/min per IP
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Register a customer account (sends OTP email)' })
  @ApiConflictResponse({ description: 'Account already exists and is verified' })
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // 5 registrations/min per IP
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Verify registration OTP → account activated, returns JWT' })
  @ApiOkResponse({ description: 'Returns JWT access token' })
  @Post('verify-otp')
  async verifyOtp(@Body() verifyDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyDto);
  }

  @ApiOperation({ summary: 'Resend registration OTP (rate-limited)' })
  @Post('resend-otp')
  async resendOtp(@Body() dto: EmailOnlyDto) {
    return this.authService.resendOtp(dto.email);
  }

  @ApiOperation({ summary: 'Send password reset OTP' })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: EmailOnlyDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @ApiOperation({ summary: 'Reset password using OTP code' })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiOperation({ summary: 'Get current authenticated user (minimal payload)' })
  @ApiBearerAuth('JWT-auth')
  @ApiOkResponse({ description: 'Current user { id, email, role }' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    // req.user contains { id, email, role } from JwtStrategy validate
    return req.user;
  }

  @ApiOperation({ summary: 'Get full profile (name, phone, verification status)' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getFullProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @ApiOperation({ summary: 'Update profile (name, phone)' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }
}
