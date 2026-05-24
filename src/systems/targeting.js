import { COLS, ROWS } from "../config.js";

export function calculateRangeTiles(state, skill, origin = state.player) {
    const tiles = [];
    const originX = origin.gridX ?? origin.x;
    const originY = origin.gridY ?? origin.y;

    if (skill.rangeType === "SELF") {
        return [{ x: originX, y: originY }];
    }

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const dx = Math.abs(x - originX);
            const dy = Math.abs(y - originY);
            const distance = dx + dy;

            if (skill.rangeType === "LINEAR" && (dx === 0 || dy === 0) && distance <= skill.range) {
                tiles.push({ x, y });
            } else if (skill.rangeType === "RADIAL" && distance <= skill.range) {
                tiles.push({ x, y });
            }
        }
    }

    return tiles;
}

export function isTileInRange(state, x, y) {
    return state.validTargetTiles.some(tile => tile.x === x && tile.y === y);
}

export function calculateAreaTiles(skill, centerX, centerY) {
    const area = skill.area ?? { shape: "SINGLE", radius: 0 };
    const radius = area.radius ?? 0;
    const tiles = [];

    for (let y = centerY - radius; y <= centerY + radius; y++) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;

            const distance = Math.abs(x - centerX) + Math.abs(y - centerY);
            if (area.shape === "SINGLE" && x === centerX && y === centerY) tiles.push({ x, y });
            if (area.shape === "DIAMOND" && distance <= radius) tiles.push({ x, y });
            if (area.shape === "CROSS" && (x === centerX || y === centerY) && distance <= radius) tiles.push({ x, y });
        }
    }

    return tiles;
}
