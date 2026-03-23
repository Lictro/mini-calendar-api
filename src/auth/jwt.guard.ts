import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// This guard will be used to protect routes and ensure that only authenticated users can access them.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
