import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async getGoogleTokens(code: string, redirectUri: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    );
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  // Revoke Google tokens when the user logs out to ensure they can't be used anymore
  async revokeGoogleToken(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.accessToken && !user.refreshToken) {
      return;
    }

    const oauth2Client = new google.auth.OAuth2();

    // Revoke both access and refresh tokens.
    // If revocation fails, we log the error but still proceed to clear tokens from our database.
    try {
      if (user.accessToken) {
        await oauth2Client.revokeToken(user.accessToken);
      }

      if (user.refreshToken) {
        await oauth2Client.revokeToken(user.refreshToken);
      }
    } catch (err) {
      console.warn('Google revoke failed (continuing logout)', err);
    }

    // Clear tokens from our database to ensure they can't be used again, even if revocation fails
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        accessToken: '',
        refreshToken: '',
      },
    });
  }

  // This method will find an existing user by their Google ID or create a new one if they don't exist.
  async findOrCreateUser(tokens: any, profile: any) {
    const user = await this.prisma.user.upsert({
      where: { googleId: profile.id },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
      },
      create: {
        email: profile.email,
        name: profile.name,
        googleId: profile.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
      },
    });

    return user;
  }

  // This method generates a JWT for the authenticated user,
  // which will be used for subsequent requests to protected routes.
  generateJwt(user: any) {
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    //   console.log('JWT generado:', token);
    //   console.log('TYPE:', typeof token);

    return token;
  }
}
