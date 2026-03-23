import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarService } from 'src/google-calendar/google-calendar.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleService: GoogleCalendarService,
  ) {}

  // This method retrieves all bookings for a specific user, ordered by start time.
  async findAllByUser(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
    });
  }

  // This method creates a new booking for a user. It first checks for any conflicting bookings in our database and then checks for conflicts in the user's Google Calendar before creating the booking.
  async createBooking(userId: number, title: string, start: Date, end: Date) {
    // Check for conflicting bookings in our database.
    // We look for any booking that overlaps with the requested time range.
    const conflict = await this.prisma.booking.findFirst({
      where: {
        userId,
        OR: [{ startTime: { lte: end }, endTime: { gte: start } }],
      },
    });

    // If a conflicting booking is found, we throw a BadRequestException to inform the client that the requested time slot is not available.
    if (conflict)
      throw new BadRequestException('Conflicting booking exists in DB');

    // Check for conflicting events in the user's Google Calendar.
    const googleConflict = await this.googleService.checkConflicts(
      userId,
      start,
      end,
    );
    if (googleConflict)
      throw new BadRequestException(
        'Conflicting event exists in Google Calendar',
      );

    return this.prisma.booking.create({
      data: { userId, title, startTime: start, endTime: end },
    });
  }

  // This method removes a booking using the userID and bookingID
  async removeBooking(userId: number, bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking || booking.userId !== userId)
      throw new BadRequestException('Booking not found');
    return this.prisma.booking.delete({ where: { id: bookingId } });
  }
}
