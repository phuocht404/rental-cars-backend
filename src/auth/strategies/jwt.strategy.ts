import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([JwtStrategy.extractJWT, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      secretOrKey: process.env.ACCESS_TOKEN_SECRET,
    });
  }

  private static extractJWT(req: Request): string | null {
    if (req.cookies && 'token' in req.cookies) {
      return req.cookies.token;
    }
    return null;
  }

  // async validate(payload: any) {
  //   return { userId: payload.sub, username: payload.username };
  // }

  async validate(payload: any) {
    const user = await this.usersService.getAuthUser(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }
    return user;
  }
}
