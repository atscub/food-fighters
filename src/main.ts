import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES } from './config/constants';
import { StartScene } from './scenes/StartScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { FightScene } from './scenes/FightScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  pixelArt: true,
  scene: [StartScene, CharacterSelectScene, FightScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    touch: true,
  },
};

const game = new Phaser.Game(config);
(window as unknown as Record<string, unknown>).__PHASER_GAME__ = game;

export { SCENES };
