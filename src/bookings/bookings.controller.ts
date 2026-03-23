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

  // This endpoint retrieves all bookings for the authenticated user.
  @Get()
  async findAll(@Req() req) {
    return this.bookingsService.findAllByUser(req.user.sub);
  }

  // This endpoint creates a new booking for the authenticated user.
  @Post()
  async create(@Req() req, @Body() body: CreateBookingDto) {
    return this.bookingsService.createBooking(
      req.user.sub,
      body.title,
      new Date(body.startTime),
      new Date(body.endTime),
    );
  }

  // This endpoint deletes a booking by its ID for the authenticated user.
  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return this.bookingsService.removeBooking(req.user.sub, parseInt(id, 10));
  }
}
