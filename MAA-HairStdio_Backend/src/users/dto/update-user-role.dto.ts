import { IsEnum } from 'class-validator';
import { UserRole } from '../user.entity';

export class UpdateUserRoleDto {
  @IsEnum(UserRole, { message: 'El rol debe ser admin, user o custom.' })
  role: UserRole;
}
