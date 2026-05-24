export const TILE_SIZE = 50;
export const COLS = 30;
export const ROWS = 30;
export const MOVE_SPEED = 5;
export const PAD_COST_PER_TILE = 0.5;
export const DUMMY_COMBAT_RANGE = 5;
export const REST_COST = 50;
export const ENEMY_COIN_REWARD_MIN = 5;
export const ENEMY_COIN_REWARD_MAX = 10;

export const TILE_TYPES = Object.freeze({
    GROUND: 0,
    WALL: 1,
    PLATEAU: 2,
    CLIFF_2: 3,
    STAIRS_2: 4,
    PEAK: 5,
    CLIFF_3: 6,
    STAIRS_3: 7
});

export const DUMMY_POSITION = Object.freeze({ x: 8, y: 5 });
