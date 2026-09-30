import { Body, Controller, Post } from '@nestjs/common';
import { ApiExtraModels, ApiOperation, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { Public } from './decorators';
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
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
  @Post('signup')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @ApiOperation({ summary: 'Sign In' })
  @ApiExtraModels(SignInSchema)
  @ApiResponse({
    status: 201,
    description: 'User signed in successfully',
    content: {
      'application/json': {
        schema: {
          $ref: getSchemaPath(SignInSchema),
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('signin')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  signIn(@Body() signInDto: SignInDto): Promise<SignInSchema> {
    return this.authService.signIn(signInDto);
  }
}
