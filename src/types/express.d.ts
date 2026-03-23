import { JwtUser } from '../auth/jwt-user.interface';

declare module 'express' {
  interface Request {
    user?: JwtUser;
  }
}
