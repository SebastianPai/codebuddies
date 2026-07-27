import { Controller, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('exercises/:id/complete')
  @UseGuards(JwtAuthGuard)
  async completeExercise(
    @Param('id') id: string,
    @Body() body: { answer: any },
    @Req() req,
  ) {
    return this.gameService.completeExercise(req.user.userId, id, body.answer);
  }
}
