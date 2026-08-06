import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// chatBubbleThemeId es puramente decorativo (color de la burbuja flotante,
// ver CHAT_BUBBLE_THEMES en apps/game) — no se persiste ni se valida el
// nivel Premium acá, solo se retransmite tal cual a la sala. Un id
// desconocido simplemente cae al tema "classic" en el cliente receptor
// (ver resolveChatBubbleTheme), así que no hace falta una whitelist estricta.
export class ChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  chatBubbleThemeId?: string;
}

export class PlayerReactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  reaction!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  chatBubbleThemeId?: string;
}

export class PlayerAnimationChangeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  animationName!: string;
}

// x/y son coordenadas de mundo en píxeles (no de tile). Los límites de
// -100000/100000 son solo una cota de cordura contra payloads absurdos;
// la protección real contra teletransporte vive en PlayerHandler.handlePlayerMove,
// que acota la distancia contra el tiempo transcurrido desde el último move.
export class PlayerMoveDto {
  @IsNumber()
  @Min(-100000)
  @Max(100000)
  x!: number;

  @IsNumber()
  @Min(-100000)
  @Max(100000)
  y!: number;

  @IsOptional()
  @IsIn(['up', 'down', 'left', 'right'])
  direction?: 'up' | 'down' | 'left' | 'right';

  @IsOptional()
  @IsBoolean()
  isMoving?: boolean;
}
