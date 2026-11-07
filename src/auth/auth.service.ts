import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { OtpService } from './otp.service';
import { OtpPurpose } from './entities/otp.entity';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
  ) {}

  private signToken(user: User): string {
    const payload = { id: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    return { accessToken: this.signToken(user) };
  }

  /** Step 1 of registration: create (unverified) customer + email OTP. */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const email = registerDto.email.toLowerCase().trim();
    const existing = await this.usersService.findByEmail(email);

    if (existing && existing.isVerified) {
      throw new ConflictException('An account with this email already exists. Please log in instead.');
    }

    // Re-use unverified account (e.g. abandoned registration or guest checkout user).
    // Password is NOT set here — it is set at the verify-otp step so it only ever
    // applies to a verified email.
    if (!existing) {
      const tempPassword = bcrypt.genSaltSync(10); // random unusable value until verified
      await this.usersService.create(email, tempPassword, 'CUSTOMER');
    }

    const code = await this.otpService.generate(email, OtpPurpose.REGISTER);
    await this.mailService.sendOtp(email, code, 'REGISTER');

    return { message: 'Verification code sent to your email' };
  }

  /** Step 2 of registration: verify OTP → mark verified, set password, return JWT. */
  async verifyOtp(verifyDto: VerifyOtpDto): Promise<{ accessToken: string }> {
    const email = verifyDto.email.toLowerCase().trim();
    await this.otpService.verify(email, OtpPurpose.REGISTER, verifyDto.code);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Account not found. Please register again.');
    }

    // Never touch role here — role is assigned at creation (and only by admins
    // afterwards). Forcing CUSTOMER here would let anyone demote an admin by
    // OTP-verifying their email.
    user.isVerified = true;
    user.password = await bcrypt.hash(verifyDto.password, 10);
    await this.usersService.save(user);

    return { accessToken: this.signToken(user) };
  }

  async resendOtp(email: string): Promise<{ message: string }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalized);
    if (!user || user.isVerified) {
      // Do not reveal whether the account exists; never send OTPs for
      // already-verified accounts (prevents OTP abuse against admin emails).
      return { message: 'If an account exists, a verification code has been sent' };
    }
    const code = await this.otpService.generate(normalized, OtpPurpose.REGISTER);
    await this.mailService.sendOtp(normalized, code, 'REGISTER');
    return { message: 'Verification code sent to your email' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalized);
    if (!user) {
      return { message: 'If an account exists, a password reset code has been sent' };
    }
    const code = await this.otpService.generate(normalized, OtpPurpose.RESET_PASSWORD);
    await this.mailService.sendPasswordReset(normalized, code);
    return { message: 'Password reset code sent to your email' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const email = dto.email.toLowerCase().trim();
    await this.otpService.verify(email, OtpPurpose.RESET_PASSWORD, dto.code);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Account not found');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.save(user);
    return { message: 'Password updated. You can now log in.' };
  }

  async getProfile(userId: number): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const { password, ...safe } = user;
    return safe as Omit<User, 'password'>;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    await this.usersService.save(user);
    const { password, ...safe } = user;
    return safe as Omit<User, 'password'>;
  }
}
