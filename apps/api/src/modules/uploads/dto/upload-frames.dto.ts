import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { WORLD_OBJECT_LIMITS as L } from '@codebuddies/world-objects';

/**
 * Campos de `POST /uploads/frames`.
 *
 * Llegan por multipart, así que TODO viene como texto: `@Type(() => Number)`
 * es lo que los convierte antes de validarlos (el ValidationPipe global corre
 * con `transform: true`).
 *
 * Los decoradores no son opcionales acá: el pipe global usa
 * `whitelist: true, forbidNonWhitelisted: true`, y un DTO sin decoradores
 * termina rechazando todas sus propias propiedades con un 400 (le pasaba a
 * UpdateWorldItemDto, ver su cabecera).
 */
export class UploadFramesDto {
  /**
   * Item al que pertenece la animación. Va en la ruta de storage, así que se
   * restringe a lo que acepta `SAFE_FOLDER` en UploadsService — sin puntos ni
   * barras, para que no haya manera de escapar del prefijo.
   */
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,64}$/, {
    message: 'itemId inválido (sólo letras, números, guiones y guiones bajos)',
  })
  itemId!: string;

  /**
   * Clave de la animación (`turn_on`, `water_loop`…). Mismo alfabeto que las
   * claves del contrato del behavior, y también forma parte de la ruta.
   */
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9_-]*$/, {
    message:
      'animationKey inválida (debe empezar por letra; sin espacios ni puntos)',
  })
  @Matches(new RegExp(`^.{1,${L.maxKeyLength}}$`), {
    message: `animationKey admite hasta ${L.maxKeyLength} caracteres`,
  })
  animationKey!: string;

  /** Columnas del atlas: cuántos frames tiene la animación. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(L.maxFramesPerAnimation)
  framesCount!: number;

  /**
   * Filas del atlas. 1 = animación no direccional (una sola pose que se reusa
   * en las 4 rotaciones). `directional` no se manda: se deriva de esto, así no
   * puede contradecir a la imagen.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  directions?: number;
}
