import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Req,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { google } from 'googleapis';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // This endpoint handles the callback from Google after the user has authenticated.
  // It exchanges the authorization code for tokens, retrieves the user's profile information,
  // and then generates a JWT for our application.
  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    const redirectUri = `http://localhost:8080/auth/google/callback`;

    const tokens = await this.authService.getGoogleTokens(code, redirectUri);

    const oauth2 = google.oauth2('v2');
    const client = new google.auth.OAuth2();
    client.setCredentials(tokens);

    const userInfo = await oauth2.userinfo.get({ auth: client });
    const user = await this.authService.findOrCreateUser(tokens, userInfo.data);

    const jwt = this.authService.generateJwt(user);

    // Set the JWT in an HTTP-only cookie to be used for subsequent requests to protected routes
    res.cookie('jwt', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    });

    res.redirect('http://localhost:3000/dashboard');
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return { user: req.user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const userId = req.user!.sub;

    await this.authService.revokeGoogleToken(userId);

    // Clear the JWT cookie to log the user out of our application
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.json({ message: 'Logged out successfully' });
  }
}
