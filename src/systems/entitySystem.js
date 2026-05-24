import { COLS, ROWS } from "../config.js";
import { isWalkableTile } from "../data/world.js";
import { createDummy, createEnemy } from "../state/createGameState.js";

export function getEntities(state) {
    return [...state.dummies, ...state.enemies];
}

export function getEntityAt(state, x, y, options = {}) {
    const { includeDummies = true, includeEnemies = true } = options;
    return getEntities(state).find(entity => {
        if (!includeDummies && entity.type === "dummy") return false;
        if (!includeEnemies && entity.type === "enemy") return false;
        return entity.gridX === x && entity.gridY === y;
    }) ?? null;
}

export function isEntityAt(state, x, y) {
    return Boolean(getEntityAt(state, x, y));
}

export function addDummy(state) {
    const tile = findOpenSpawnTile(state);
    if (!tile) return null;

    const dummy = createDummy(tile.x, tile.y);
    state.dummies.push(dummy);
    return dummy;
}

export function addEnemy(state) {
    const tile = findOpenSpawnTile(state);
    if (!tile) return null;

    const enemy = createEnemy(tile.x, tile.y);
    state.enemies.push(enemy);
    return enemy;
}

export function removeLastDummy(state) {
    return state.dummies.pop() ?? null;
}

export function removeLastEnemy(state) {
    return state.enemies.pop() ?? null;
}

export function removeEntity(state, entity) {
    const list = entity.type === "enemy" ? state.enemies : state.dummies;
    const index = list.findIndex(candidate => candidate.id === entity.id);
    if (index === -1) return false;

    list.splice(index, 1);
    return true;
}

function findOpenSpawnTile(state) {
    const anchors = [
        { x: state.player.gridX + 2, y: state.player.gridY },
        { x: state.player.gridX + 1, y: state.player.gridY + 1 },
        { x: state.player.gridX, y: state.player.gridY + 2 },
        { x: state.player.gridX - 1, y: state.player.gridY + 1 },
        { x: state.player.gridX + 3, y: state.player.gridY },
        { x: state.player.gridX, y: state.player.gridY + 3 }
    ];

    for (const tile of anchors) {
        if (canSpawnAt(state, tile.x, tile.y)) return tile;
    }

    for (let radius = 1; radius < 10; radius++) {
        for (let y = state.player.gridY - radius; y <= state.player.gridY + radius; y++) {
            for (let x = state.player.gridX - radius; x <= state.player.gridX + radius; x++) {
                if (canSpawnAt(state, x, y)) return { x, y };
            }
        }
    }

    return null;
}

function canSpawnAt(state, x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    if (!isWalkableTile(state.map[y][x])) return false;
    if (state.player.gridX === x && state.player.gridY === y) return false;
    return !isEntityAt(state, x, y);
}
