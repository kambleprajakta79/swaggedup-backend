import { IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({ example: 'MANAGER', enum: ['ADMIN', 'MANAGER', 'CUSTOMER'], description: 'New role for the user' })
  @IsNotEmpty({ message: 'Role is required' })
  @IsIn(['ADMIN', 'MANAGER', 'CUSTOMER'], { message: 'Role must be ADMIN, MANAGER or CUSTOMER' })
  role: string;
}
