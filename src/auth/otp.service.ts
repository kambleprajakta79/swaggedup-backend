import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull, Not } from 'typeorm';
import { Otp, OtpPurpose } from './entities/otp.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
  ) {}

  /** Generate and persist a new OTP for the given email + purpose. Returns the plain code. */
  async generate(email: string, purpose: OtpPurpose): Promise<string> {
    // Rate limit: one OTP per email+purpose per minute
    const recent = await this.otpRepository.findOne({
      where: {
        email,
        purpose,
        createdAt: MoreThan(new Date(Date.now() - RESEND_COOLDOWN_MS)),
      },
      order: { createdAt: 'DESC' },
    });
    if (recent) {
      throw new HttpException('Please wait a minute before requesting a new code', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = crypto.randomInt(100000, 1000000).toString(); // 6-digit code
    const codeHash = await bcrypt.hash(code, 8);
    const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);

    const otp = this.otpRepository.create({
      email,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    });
    await this.otpRepository.save(otp);
    return code;
  }

  /** Verify the code for an email + purpose. Consumes the OTP on success. */
  async verify(email: string, purpose: OtpPurpose, code: string): Promise<void> {
    const otp = await this.otpRepository.findOne({
      where: {
        email,
        purpose,
        consumedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException('Verification code is invalid or has expired');
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Please request a new code');
    }

    // Dev convenience: accept a fixed dummy code outside production so flows can
    // be tested without a mail server. Never enabled in production.
    const isDev = process.env.NODE_ENV !== 'production';
    const matches =
      (isDev && code === '111111') || (await bcrypt.compare(code, otp.codeHash));
    if (!matches) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);
      throw new BadRequestException('Verification code is invalid or has expired');
    }

    otp.consumedAt = new Date();
    await this.otpRepository.save(otp);
  }

  /** Housekeeping: remove expired/consumed OTPs older than a day. */
  async cleanup(): Promise<void> {
    await this.otpRepository.delete({
      createdAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      consumedAt: Not(IsNull()),
    });
  }
}
