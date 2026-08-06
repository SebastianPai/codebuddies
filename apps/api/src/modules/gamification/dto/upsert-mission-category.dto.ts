export class UpsertMissionCategoryDto {
  name!: string;
  description?: string;
  icon?: string;
  color?: string;
  active?: boolean;
  sortOrder?: number;
}
