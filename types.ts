export enum GamePhase {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Platform {
  x: number;
  z: number;
  w: number;
  h: number; // Actually depth in 2D, but logic uses x/z plane
  color: string;
  id: number;
}

export interface Player {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotation: number; // Facing direction (0 = +X, 1.57 = -Z roughly)
  scaleY: number; // For squash animation
}

export interface GameState {
  score: number;
  phase: GamePhase;
  lastScore: number;
}
