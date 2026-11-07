import { Controller, Get, Patch, Body, Param, UseGuards, ParseIntPipe, Request, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin-users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'List all users (admin only)' })
  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    // Never expose password hashes
    return users.map((u) => ({ id: u.id, email: u.email, role: u.role, createdAt: u.createdAt }));
  }

  @ApiOperation({ summary: "Change a user's role (admin only)" })
  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @Request() req: any,
  ) {
    // Prevent an admin from demoting themselves (lockout protection)
    if (req.user && req.user.id === id) {
      throw new BadRequestException('You cannot change your own role');
    }
    const updated = await this.usersService.updateRole(id, dto.role);
    return { id: updated.id, email: updated.email, role: updated.role };
  }
}
