import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { LoginResponseDTO } from './dtos/login-response.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './types/interfaces/jwt-payload.interface';
import { RegisterDTO } from './dtos/register.dto';
import { RegisterResponseDTO } from './dtos/register-response.dto';
import { CreateUserDTO } from 'src/users/dtos/create-user.dto';
import { Prisma, User } from 'generated/prisma';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomBytes } from 'crypto';
import { parseDurationToMs } from 'src/common/utils/time.utils';
import { Logger } from '@nestjs/common';
import {
  composeRefreshComposite,
  parseRefreshComposite,
} from 'src/common/utils/token.utils';
import {
  REFRESH_RAW_BYTES,
  SALT_ROUNDS,
} from 'src/common/constants/auth.constants';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  private readonly refreshTokenExpiryMs: number;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.saltRounds = this.configService.get<number>(
      'bcrypt.saltRounds',
      SALT_ROUNDS,
    );
    const refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    );
    this.refreshTokenExpiryMs = parseDurationToMs(refreshExpiresIn);
  }

  async login(
    user: User,
  ): Promise<LoginResponseDTO & { refreshToken?: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const { compositeToken } = await this.generateRefreshToken(user.id);
    return {
      accessToken,
      refreshToken: compositeToken,
    };
  }

  async register(registerDTO: RegisterDTO): Promise<RegisterResponseDTO> {
    const { password, email, username } = registerDTO;

    const exists = await this.usersService.findUniqueByEmail(email);
    if (exists) {
      throw new ConflictException(
        `User with ${email} email address already exists`,
      );
    }

    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    const userData: CreateUserDTO = {
      email,
      password: passwordHash,
      username,
    };

    try {
      const createdUser = await this.usersService.create(userData);
      return createdUser;
    } catch (err: unknown) {
      // handle unique constraint race (Prisma error code P2002) edge case when two users try to register the same email nearly simultaneously.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('User with given email already exists');
      }
      throw err;
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findUniqueByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  }

  // Refresh token methods

  private async hashToken(raw: string): Promise<string> {
    return bcrypt.hash(raw, this.saltRounds);
  }

  // generate a random token, store hashed version in DB, return composite `<id>.<raw>`
  async generateRefreshToken(userId: string) {
    const raw = randomBytes(REFRESH_RAW_BYTES).toString('hex'); // 96 chars
    const tokenHash = await this.hashToken(raw);
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiryMs);

    const created = await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });

    const compositeToken = composeRefreshComposite(created.id, raw);
    return { compositeToken, created };
  }

  // verify composite token string; throw if invalid; returns token record
  async verifyRefreshToken(composite: string) {
    const { id, raw } = parseRefreshComposite(composite);

    if (!composite)
      throw new UnauthorizedException('No refresh token provided');

    if (!id || !raw) throw new UnauthorizedException('Malformed refresh token');

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id },
    });
    if (!tokenRecord) throw new UnauthorizedException('Invalid refresh token');
    this.logger.warn(
      `Possible refresh token misuse for tokenId=${id}, revoking. IP?`,
    );

    if (tokenRecord.revoked)
      throw new UnauthorizedException('Refresh token revoked');

    if (tokenRecord.expiresAt && tokenRecord.expiresAt.getTime() < Date.now()) {
      // optionally delete expired token here
      await this.prisma.refreshToken.update({
        where: { id },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    const matches = await bcrypt.compare(raw, tokenRecord.tokenHash);
    if (!matches) {
      // possible token theft attempt: revoke this token record
      await this.prisma.refreshToken.update({
        where: { id },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    return tokenRecord;
  }

  // rotate: mark old token revoked and create a new token
  async rotateRefreshTokenAtomic(oldComposite: string) {
    const { id, raw } = parseRefreshComposite(oldComposite);
    if (!id || !raw) throw new UnauthorizedException('Malformed refresh token');

    // Load token first and verify raw (we still need to compare)
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id },
    });
    if (!tokenRecord) throw new UnauthorizedException('Invalid refresh token');
    if (tokenRecord.revoked)
      throw new UnauthorizedException('Refresh token revoked');
    if (tokenRecord.expiresAt && tokenRecord.expiresAt.getTime() < Date.now()) {
      await this.prisma.refreshToken.update({
        where: { id },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    const matches = await bcrypt.compare(raw, tokenRecord.tokenHash);
    if (!matches) {
      // revoke on mismatch
      await this.prisma.refreshToken.update({
        where: { id },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Now do revoke + create inside a transaction for atomicity
    const rawNew = randomBytes(REFRESH_RAW_BYTES).toString('hex');
    const tokenHashNew = await this.hashToken(rawNew);
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiryMs);

    const [revoked, created] = await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revoked: true },
      }),
      this.prisma.refreshToken.create({
        data: {
          tokenHash: tokenHashNew,
          userId: tokenRecord.userId,
          expiresAt,
        },
      }),
    ]);

    return {
      compositeToken: composeRefreshComposite(created.id, rawNew),
      revoked,
      created,
    };
  }

  async refresh(oldComposite: string) {
    // rotate atomically (revokes old + creates new)
    const { compositeToken: newComposite } =
      await this.rotateRefreshTokenAtomic(oldComposite);

    const { id: newId } = parseRefreshComposite(newComposite);

    // fetch the new token record
    const newTokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id: newId },
    });
    if (!newTokenRecord) {
      throw new UnauthorizedException('Refresh token corrupted');
    }

    // fetch user
    const user = await this.usersService.findUniqueById(newTokenRecord.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // generate new access token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    // return both tokens
    return {
      accessToken,
      refreshToken: newComposite,
    };
  }

  // logout: revoke given refresh token (by composite). For "logout all", you can revoke all tokens for user.
  async logout(
    composite?: string,
    userId?: string,
    revokeAll = false,
  ): Promise<void> {
    if (revokeAll && userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
      return;
    }

    if (!composite) return;

    const { id } = parseRefreshComposite(composite);
    if (!id) return;

    await this.prisma.refreshToken.updateMany({
      where: { id, revoked: false },
      data: { revoked: true },
    });
  }
}
