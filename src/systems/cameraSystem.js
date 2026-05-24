import { COLS, ROWS, TILE_SIZE } from "../config.js";

export function updateCameraFollow(state, canvas) {
    if (state.camera.lockedToPlayer === false) {
        clampCamera(state, canvas);
        return;
    }

    centerCameraOnPlayer(state, canvas);
}

export function centerCameraOnPlayer(state, canvas) {
    state.camera.lockedToPlayer = true;
    state.camera.x = state.player.pixelX + TILE_SIZE / 2 - canvas.width / 2;
    state.camera.y = state.player.pixelY + TILE_SIZE / 2 - canvas.height / 2;
    clampCamera(state, canvas);
}

export function panCamera(state, canvas, deltaX, deltaY) {
    state.camera.lockedToPlayer = false;
    state.camera.x += deltaX;
    state.camera.y += deltaY;
    clampCamera(state, canvas);
}

export function clampCamera(state, canvas) {
    const bounds = getCameraBounds(canvas);
    state.camera.x = Math.max(0, Math.min(state.camera.x, bounds.maxX));
    state.camera.y = Math.max(0, Math.min(state.camera.y, bounds.maxY));
}

function getCameraBounds(canvas) {
    return {
        maxX: Math.max(0, COLS * TILE_SIZE - canvas.width),
        maxY: Math.max(0, ROWS * TILE_SIZE - canvas.height)
    };
}
