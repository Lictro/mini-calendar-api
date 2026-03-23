import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Retrieves all bookings for the authenticated user.
  // Requires a valid JWT cookie.
  // Returns an array of bookings.
  @Get()
  async findAll(@Req() req) {
    return this.bookingsService.findAllByUser(req.user.sub);
  }

  // Creates a new booking for the authenticated user.
  // Expects a JSON body with `title`, `startTime`, and `endTime`.
  // Converts `startTime` and `endTime` to Date objects before saving.
  // Returns the created booking object.
  @Post()
  async create(@Req() req, @Body() body: CreateBookingDto) {
    return this.bookingsService.createBooking(
      req.user.sub,
      body.title,
      new Date(body.startTime),
      new Date(body.endTime),
    );
  }

  // Deletes a booking by its ID for the authenticated user.
  // Requires a valid JWT cookie.
  // Returns a confirmation or the deleted booking.
  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return this.bookingsService.removeBooking(req.user.sub, parseInt(id, 10));
  }
}
