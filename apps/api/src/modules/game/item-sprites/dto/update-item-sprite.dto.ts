import { PartialType } from '@nestjs/mapped-types';
import { CreateItemSpriteDto } from './create-item-sprite.dto';

export class UpdateItemSpriteDto extends PartialType(CreateItemSpriteDto) {}
