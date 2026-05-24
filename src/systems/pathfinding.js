import { COLS, ROWS } from "../config.js";
import { canMoveBetween, isWalkableTile } from "../data/world.js";
import { isEntityAt } from "./entitySystem.js";

function isBlockedByEntity(state, x, y) {
    return (
        (state.player.gridX === x && state.player.gridY === y) ||
        isEntityAt(state, x, y)
    );
}

export function findPath(state, startX, startY, endX, endY, options = {}) {
    const { ignoreTargetBlocker = false } = options;

    if (endX < 0 || endX >= COLS || endY < 0 || endY >= ROWS) return null;

    const targetType = state.map[endY][endX];
    if (!isWalkableTile(targetType)) return null;

    const queue = [{ x: startX, y: startY, path: [] }];
    const visited = new Set([`${startX},${startY}`]);

    while (queue.length > 0) {
        const current = queue.shift();
        if (current.x === endX && current.y === endY) return current.path;

        const currentTileType = state.map[current.y][current.x];
        const directions = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
        ];

        for (const direction of directions) {
            const nextX = current.x + direction.x;
            const nextY = current.y + direction.y;
            const key = `${nextX},${nextY}`;

            if (nextX < 0 || nextX >= COLS || nextY < 0 || nextY >= ROWS || visited.has(key)) continue;

            const nextType = state.map[nextY][nextX];
            if (!canMoveBetween(currentTileType, nextType, direction)) continue;

            const isTarget = nextX === endX && nextY === endY;
            if (isBlockedByEntity(state, nextX, nextY) && !(ignoreTargetBlocker && isTarget)) continue;

            visited.add(key);
            queue.push({
                x: nextX,
                y: nextY,
                path: [...current.path, { x: nextX, y: nextY }]
            });
        }
    }

    return null;
}
