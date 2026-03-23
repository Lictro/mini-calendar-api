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

    // Handles Google OAuth callback after user authentication
  // 1. Exchanges the authorization code for Google access/refresh tokens
  // 2. Retrieves the user's Google profile info
  // 3. Creates or finds the user in our database
  // 4. Generates a JWT and sets it in an HTTP-only cookie
  // 5. Redirects the user to the frontend dashboard
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

  // Returns the current authenticated user's info
  // Requires a valid JWT cookie
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return { user: req.user };
  }

  // Logs out the user
  // 1. Revokes the user's Google access token
  // 2. Clears the JWT cookie
  // 3. Returns a confirmation message
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
