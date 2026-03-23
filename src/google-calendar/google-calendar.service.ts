import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoogleCalendarService {
  private oauth2Client;

  constructor(private prisma: PrismaService) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
  }

  /**
   * Ensure valid access token
   */
  private async ensureValidAccessToken(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    this.oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
    });

    /**
     * IMPORTANT:
     * This refreshes automatically IF expired
     */
    const { credentials } = await this.oauth2Client.refreshAccessToken();

    // Google may return a new access token
    if (credentials.access_token) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          accessToken: credentials.access_token,
        },
      });

      return credentials.access_token;
    }

    // fallback (still valid)
    return user.accessToken;
  }

  async checkConflicts(userId: number, start: Date, end: Date) {
    // Ensure we have a valid access token (refresh if needed)
    const accessToken = await this.ensureValidAccessToken(userId);

    // Set the token for the OAuth2 client
    this.oauth2Client.setCredentials({ access_token: accessToken });

    // Create Google Calendar client
    const calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    });

    // List events in the given time range
    const res = await calendar.events.list({
      calendarId: 'primary', // user's main calendar
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      maxResults: 1, // we only need to know if there's a conflict
    });

    // Return true if at least one event exists in the range
    return (res.data.items?.length ?? 0) > 0;
  }
}
