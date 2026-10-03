import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiExtraModels, ApiOperation, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from './auth.cookies';
import { AuthService } from './auth.service';
import { GetCurrentUser, Public } from './decorators';
import { SignInDto, SignUpDto } from './dto';
import { SignInSchema, SignUpSchema } from './schemas';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Sign Up' })
  @ApiExtraModels(SignUpSchema)
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    content: {
      'application/json': {
        schema: {
          $ref: getSchemaPath(SignUpSchema),
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
  @Post('signup')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @ApiOperation({ summary: 'Sign In — token được trả về qua cookie httpOnly' })
  @ApiExtraModels(SignInSchema)
  @ApiResponse({
    status: 200,
    description: 'User signed in successfully',
    content: {
      'application/json': {
        schema: {
          $ref: getSchemaPath(SignInSchema),
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('signin')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  async signIn(@Body() signInDto: SignInDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.signIn(signInDto, req.headers['user-agent']);

    setAuthCookies(res, tokens);

    return { user };
  }

  @ApiOperation({ summary: 'Cấp lại access token từ refresh token (cookie)' })
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Public()
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const { user, tokens } = await this.authService.refresh(req.cookies?.[REFRESH_TOKEN_COOKIE]);

      setAuthCookies(res, tokens);

      return { user };
    } catch (error) {
      clearAuthCookies(res);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Đăng xuất thiết bị hiện tại (thu hồi phiên)' })
  @Post('logout')
  @HttpCode(200)
  @Public()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[REFRESH_TOKEN_COOKIE]);
    clearAuthCookies(res);

    return { success: true };
  }

  @ApiOperation({ summary: 'Đăng xuất khỏi mọi thiết bị' })
  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(@GetCurrentUser() currentUser: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(currentUser.id);
    clearAuthCookies(res);

    return { success: true };
  }

  @ApiOperation({ summary: 'Thông tin người dùng hiện tại' })
  @Get('me')
  me(@GetCurrentUser() currentUser: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sessionId, ...user } = currentUser;

    return user;
  }
}
