import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum AdminUserAction {
  GRANT_ADMIN = 'GRANT_ADMIN',
  REMOVE_ADMIN = 'REMOVE_ADMIN',
  GRANT_PREMIUM = 'GRANT_PREMIUM',
  REVOKE_PREMIUM = 'REVOKE_PREMIUM',
  ADD_XP = 'ADD_XP',
  REMOVE_XP = 'REMOVE_XP',
  ADD_COINS = 'ADD_COINS',
  REMOVE_COINS = 'REMOVE_COINS',
  SUSPEND_USER = 'SUSPEND_USER',
  UNSUSPEND_USER = 'UNSUSPEND_USER',
}

export class AdminUserActionDto {
  @IsEnum(AdminUserAction)
  action: AdminUserAction;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
