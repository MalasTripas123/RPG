import { COLS, ROWS, TILE_TYPES } from "../config.js";

export const RAW_MAP = Object.freeze([
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwww2222222wwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwww2222333322wwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwww22233333332Xwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwww22333333333222wwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwww222333333333322wwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwww2223333333333322wwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwww222X33333333333_0wwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwX_22X333333333310wwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwX1X22X333333333100wwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwww11X22XX3333XXX10000wwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwX11X222XXX_X11_00000wwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwX11XXXXXX_11X001100ww0wwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwX111111111X0011100000wwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwXXXXX111X00111_00000wwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwww0000XXX001111000000wwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwww0www00011111111000wwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwww00w0001111112211100wwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwww0001111222222211100wwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwww00112222222222111100wwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwww0112222223322_122110wwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwww001222223333222222110wwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwww00112222233333222222110wwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwww00011222233333X2222221X0wwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwww001112222X_33X22222_X100wwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwww001111X22222XX22222X11X0wwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwww0011111XX222222222211100wwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwww0011X11111XXXXX2222X11X0wwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwww000110X111111111XXXX11100wwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwww000011001111X111111111XX0wwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwww00011110XXXX0X11XXXXXX000wwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwww000111X0000000110000000wwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwww0000X_X000001111X0wwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwww00000000ww000111100wwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwww000000000wwww0X11X0wwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwww00000000000www00X_00wwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwww00000000000ww000000wwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwww00000000000w000wwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwww00000000000000wwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwww00000000000000wwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwww0000011111000wwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwww0000111111100wwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwww00011111_XX000wwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwww0011111X000000000000wwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwww0011111100000000111100wwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwww0011111111000001111111000wwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwww0111111111100011111111100wwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwww01111111111111111111111100wwwwwwwwwwwww",
    "wwwwwwwwwwwwwwww00111111111111111111111110wwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwww001111111111111111111111X0wwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwww00111111111111111111111_00wwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwww0X111111111111111111XX00wwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwww001111111111111111XX000wwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwww0111111111111111X0wwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwww0X1111111111111X00wwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwww00XX1111111111100wwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwww001111111111X0wwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwww0011111111XX00wwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwww00111_XXXX000wwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwww00111000000wwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwww0XXX00000wwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwww0000000wwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwww0000wwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwww000wwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"
]);

export function createMap() {
    validateRawMap();
    return RAW_MAP.map(row => [...row.padEnd(COLS, "w")].map(createTileFromCharacter));
}

export function canMoveBetween(currentTileType, nextTileType, direction = { x: 0, y: 0 }) {
    if (!isWalkableTile(currentTileType) || !isWalkableTile(nextTileType)) return false;

    if (isRampTile(currentTileType) || isRampTile(nextTileType)) {
        const isVerticalMove = direction.x === 0 && direction.y !== 0;
        const connectsTwoRamps = isRampTile(currentTileType) && isRampTile(nextTileType);
        return isVerticalMove || connectsTwoRamps;
    }

    return getTileLevel(currentTileType) === getTileLevel(nextTileType);
}

export function isWalkableTile(tileType) {
    return tileType !== TILE_TYPES.WALL && tileType !== TILE_TYPES.WATER;
}

export function isRampTile(tileType) {
    return tileType === TILE_TYPES.RAMP;
}

export function getTileLevel(tileType) {
    if (tileType === TILE_TYPES.GROUND) return 0;
    if (tileType === TILE_TYPES.HEIGHT_1) return 1;
    if (tileType === TILE_TYPES.HEIGHT_2) return 2;
    if (tileType === TILE_TYPES.HEIGHT_3) return 3;
    return null;
}

export function getHeightOffset(tileType) {
    return 0;
}

function createTileFromCharacter(character) {
    switch (character) {
        case "0":
            return TILE_TYPES.GROUND;
        case "1":
            return TILE_TYPES.HEIGHT_1;
        case "2":
            return TILE_TYPES.HEIGHT_2;
        case "3":
            return TILE_TYPES.HEIGHT_3;
        case "X":
            return TILE_TYPES.WALL;
        case "_":
            return TILE_TYPES.RAMP;
        case "w":
            return TILE_TYPES.WATER;
        default:
            throw new Error(`Unknown map character: ${character}`);
    }
}

function validateRawMap() {
    if (RAW_MAP.length !== ROWS) {
        throw new Error(`Map row count mismatch: expected ${ROWS}, got ${RAW_MAP.length}`);
    }

    RAW_MAP.forEach((row, index) => {
        if (row.length > COLS) {
            throw new Error(`Map column count mismatch at row ${index}: expected up to ${COLS}, got ${row.length}`);
        }
    });
}
