import { TILE_SIZE } from "../config.js";

export function addFloatingText(state, text, gridX, gridY, color, yOffset = 0) {
    state.floatingTexts.push({
        text,
        x: gridX * TILE_SIZE + TILE_SIZE / 2,
        y: gridY * TILE_SIZE + yOffset,
        color,
        life: 60
    });
}
