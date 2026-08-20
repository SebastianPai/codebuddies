import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

const SUPPORTED_UI_LANGUAGES = ['es', 'en-us', 'zh-Hans'] as const;
const SUPPORTED_PC_THEMES = ['dark', 'light'] as const;

// Espejo de CHAT_BUBBLE_THEMES en apps/game/.../hud/nameplateStyles.ts — el
// nivel Premium de cada uno se valida en IdentityService#updateProfile, acá
// solo se valida que sea un id conocido.
export const SUPPORTED_CHAT_BUBBLE_THEMES = [
  'classic',
  'midnight',
  'gold',
  'violet',
  'electricBlue',
  'emerald',
  'rose',
  'sunset',
] as const;

// Espejo de los ids con usage:"nameEffect" en
// packages/visual-effects/index.ts — el nivel Premium de cada uno se valida
// en IdentityService#updateProfile, acá solo se valida que sea un id
// conocido. apps/api no depende del paquete de tokens (frontend-only),
// mismo criterio que SUPPORTED_CHAT_BUBBLE_THEMES.
export const SUPPORTED_NAME_EFFECTS = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'rainbow',
  'diamond',
  'mythic',
  'divine',
  'galaxy',
  'aurora',
  'ice',
  'fire',
  'emerald',
  'ruby',
  'sapphire',
  'holographic',
  'obsidian',
  'cyber',
  'matrix',
  'electric',
  'crystal',
] as const;

export class UpdateProfileDto {
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  country?: string;

  // Compartido entre apps/web y apps/game — ver comentario en schema.prisma
  // junto a User.uiLanguage.
  @IsOptional()
  @IsIn(SUPPORTED_UI_LANGUAGES)
  uiLanguage?: string;

  // Ver comentario en schema.prisma junto a User.pcTheme.
  @IsOptional()
  @IsIn(SUPPORTED_PC_THEMES)
  pcTheme?: string;

  // Ver comentario en schema.prisma junto a User.chatBubbleThemeId.
  @IsOptional()
  @IsIn(SUPPORTED_CHAT_BUBBLE_THEMES)
  chatBubbleThemeId?: string;

  // Ver comentario en schema.prisma junto a User.nameEffectId.
  @IsOptional()
  @IsIn(SUPPORTED_NAME_EFFECTS)
  nameEffectId?: string;
}
