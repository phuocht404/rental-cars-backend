import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SessionsService } from 'src/sessions/sessions.service';

import { ACCESS_TOKEN_COOKIE } from '../auth.cookies';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly sessionsService: SessionsService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([JwtStrategy.extractJWT, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      secretOrKey: process.env.ACCESS_TOKEN_SECRET,
    });
  }

  private static extractJWT(req: Request): string | null {
    return req.cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
  }

  // Token phải thuộc một phiên còn hiệu lực: đăng xuất/đổi mật khẩu/khoá tài khoản có tác dụng ngay
  // (độ trễ tối đa bằng thời gian cache trong SessionsService)
  async validate(payload: any) {
    if (!payload?.sid) throw new UnauthorizedException();

    const user = await this.sessionsService.getAuthUser(Number(payload.sub), payload.sid);
    if (!user) throw new UnauthorizedException();

    return user;
  }
}
