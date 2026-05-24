import { COLS, ROWS, TILE_TYPES } from "../config.js";

export function createMap() {
    const map = Array(ROWS).fill(null).map(() => Array(COLS).fill(TILE_TYPES.GROUND));

    for (let x = 0; x < COLS; x++) {
        map[0][x] = TILE_TYPES.WALL;
        map[ROWS - 1][x] = TILE_TYPES.WALL;
    }

    for (let y = 0; y < ROWS; y++) {
        map[y][0] = TILE_TYPES.WALL;
        map[y][COLS - 1] = TILE_TYPES.WALL;
    }

    for (let y = 4; y <= 16; y++) {
        for (let x = 15; x <= 27; x++) map[y][x] = TILE_TYPES.PLATEAU;
    }

    for (let y = 4; y <= 16; y++) map[y][14] = TILE_TYPES.CLIFF_2;
    for (let x = 15; x <= 27; x++) map[17][x] = TILE_TYPES.CLIFF_2;

    map[17][20] = TILE_TYPES.STAIRS_2;
    map[17][21] = TILE_TYPES.STAIRS_2;
    map[10][14] = TILE_TYPES.STAIRS_2;

    for (let y = 6; y <= 11; y++) {
        for (let x = 19; x <= 25; x++) map[y][x] = TILE_TYPES.PEAK;
    }

    for (let y = 6; y <= 11; y++) map[y][18] = TILE_TYPES.CLIFF_3;
    for (let x = 19; x <= 25; x++) map[12][x] = TILE_TYPES.CLIFF_3;

    map[12][22] = TILE_TYPES.STAIRS_3;
    map[9][18] = TILE_TYPES.STAIRS_3;

    map[22][8] = TILE_TYPES.WALL;
    map[23][8] = TILE_TYPES.WALL;
    map[22][9] = TILE_TYPES.WALL;
    map[8][5] = TILE_TYPES.WALL;
    map[8][6] = TILE_TYPES.WALL;
    map[20][20] = TILE_TYPES.WALL;

    return map;
}

export function canMoveBetween(currentTileType, nextTileType) {
    const validTransitions = {
        [TILE_TYPES.GROUND]: [TILE_TYPES.GROUND, TILE_TYPES.STAIRS_2],
        [TILE_TYPES.PLATEAU]: [TILE_TYPES.PLATEAU, TILE_TYPES.STAIRS_2, TILE_TYPES.STAIRS_3],
        [TILE_TYPES.PEAK]: [TILE_TYPES.PEAK, TILE_TYPES.STAIRS_3],
        [TILE_TYPES.STAIRS_2]: [TILE_TYPES.GROUND, TILE_TYPES.PLATEAU, TILE_TYPES.STAIRS_2],
        [TILE_TYPES.STAIRS_3]: [TILE_TYPES.PLATEAU, TILE_TYPES.PEAK, TILE_TYPES.STAIRS_3]
    };

    return Boolean(validTransitions[currentTileType]?.includes(nextTileType));
}

export function isWalkableTile(tileType) {
    return tileType !== TILE_TYPES.WALL && tileType !== TILE_TYPES.CLIFF_2 && tileType !== TILE_TYPES.CLIFF_3;
}

export function getHeightOffset(tileType) {
    if (tileType === TILE_TYPES.PLATEAU || tileType === TILE_TYPES.STAIRS_2 || tileType === TILE_TYPES.CLIFF_2) return 8;
    if (tileType === TILE_TYPES.PEAK || tileType === TILE_TYPES.STAIRS_3 || tileType === TILE_TYPES.CLIFF_3) return 16;
    return 0;
}
