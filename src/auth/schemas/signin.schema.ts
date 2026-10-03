import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from 'src/users/dto';

// Token không nằm trong body mà được set qua cookie httpOnly (access_token, refresh_token)
export class SignInSchema {
  @ApiProperty({
    type: UserDto,
  })
  user: UserDto;
}
