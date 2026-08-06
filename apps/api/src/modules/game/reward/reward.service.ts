import { Injectable } from '@nestjs/common';

@Injectable()
export class RewardService {
  calculateNewXP(currentXP: number, gained: number) {
    return currentXP + gained;
  }

  calculateLevel(xp: number) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }
}
