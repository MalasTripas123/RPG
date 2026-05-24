import { COLS, ROWS, TILE_SIZE, TILE_TYPES } from "../config.js";
import { ITEMS_DB } from "../data/items.js";
import { getEntities } from "../systems/entitySystem.js";
import { findPath } from "../systems/pathfinding.js";
import { calculateAreaTiles, isTileInRange } from "../systems/targeting.js";
import { getAvailableMoveSteps } from "../systems/movementSystem.js";
import { updateCameraFollow } from "../systems/cameraSystem.js";

export function renderCanvas(state, canvas, ctx) {
    updateCameraFollow(state, canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);

    drawMap(state, canvas, ctx);
    drawOverlays(state, ctx);
    drawEntities(state, ctx);
    drawPlayer(state, ctx);
    drawFloatingTexts(state, ctx);

    ctx.restore();
}

function drawMap(state, canvas, ctx) {
    const startCol = Math.max(0, Math.floor(state.camera.x / TILE_SIZE));
    const endCol = Math.min(COLS, startCol + Math.ceil(canvas.width / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(state.camera.y / TILE_SIZE));
    const endRow = Math.min(ROWS, startRow + Math.ceil(canvas.height / TILE_SIZE) + 1);

    for (let y = startRow; y < endRow; y++) {
        for (let x = startCol; x < endCol; x++) {
            drawTile(ctx, state.map[y][x], x * TILE_SIZE, y * TILE_SIZE);
        }
    }
}

function drawTile(ctx, type, px, py) {
    if (type === TILE_TYPES.WATER) {
        drawWaterTile(ctx, px, py);
    } else if (type === TILE_TYPES.GROUND) {
        drawHeightTile(ctx, px, py, "#2c3e50", 0.04);
    } else if (type === TILE_TYPES.HEIGHT_1) {
        drawHeightTile(ctx, px, py, "#34495e", 0.08);
    } else if (type === TILE_TYPES.HEIGHT_2) {
        drawHeightTile(ctx, px, py, "#455a64", 0.12);
    } else if (type === TILE_TYPES.HEIGHT_3) {
        drawHeightTile(ctx, px, py, "#546e7a", 0.16);
    } else if (type === TILE_TYPES.WALL) {
        drawWallTile(ctx, px, py);
    } else if (type === TILE_TYPES.RAMP) {
        drawRampTile(ctx, px, py);
    }

    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
}

function drawHeightTile(ctx, px, py, color, highlightAlpha) {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = `rgba(255,255,255,${highlightAlpha})`;
    ctx.fillRect(px, py, TILE_SIZE, 3);
    ctx.fillRect(px, py, 3, TILE_SIZE);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(px, py + TILE_SIZE - 3, TILE_SIZE, 3);
    ctx.fillRect(px + TILE_SIZE - 3, py, 3, TILE_SIZE);
}

function drawWaterTile(ctx, px, py) {
    ctx.fillStyle = "#0b2233";
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = "rgba(74, 144, 178, 0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 7, py + 18);
    ctx.quadraticCurveTo(px + 16, py + 12, px + 25, py + 18);
    ctx.quadraticCurveTo(px + 34, py + 24, px + 43, py + 18);
    ctx.moveTo(px + 5, py + 34);
    ctx.quadraticCurveTo(px + 15, py + 28, px + 25, py + 34);
    ctx.quadraticCurveTo(px + 35, py + 40, px + 45, py + 34);
    ctx.stroke();
}

function drawWallTile(ctx, px, py) {
    ctx.fillStyle = "#111820";
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = "#05080c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 13, py);
    ctx.lineTo(px + 13, py + TILE_SIZE);
    ctx.moveTo(px + 36, py);
    ctx.lineTo(px + 36, py + TILE_SIZE);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(px, py, TILE_SIZE, 2);
}

function drawRampTile(ctx, px, py) {
    ctx.fillStyle = "#3c4d56";
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = "#8d6e63";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px + 6, py + 39);
    ctx.lineTo(px + 39, py + 6);
    ctx.moveTo(px + 13, py + 45);
    ctx.lineTo(px + 45, py + 13);
    ctx.moveTo(px + 5, py + 27);
    ctx.lineTo(px + 27, py + 5);
    ctx.stroke();
}

function drawOverlays(state, ctx) {
    if (state.combatPhase === "WALK" && state.player.plannedMove?.path?.length > 0) {
        drawPathTiles(ctx, state.player.plannedMove.path, "rgba(46, 204, 113, 0.42)", "rgba(46, 204, 113, 0.82)");
    }

    if (state.mode === "TARGETING") {
        state.validTargetTiles.forEach(tile => {
            ctx.fillStyle = "rgba(241, 196, 15, 0.3)";
            ctx.fillRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        });

        if (state.hoverTile && isTileInRange(state, state.hoverTile.x, state.hoverTile.y)) {
            const skill = state.activeAction ? ITEMS_DB[state.activeAction.item.itemId] : null;
            const areaTiles = skill ? calculateAreaTiles(skill, state.hoverTile.x, state.hoverTile.y) : [state.hoverTile];

            areaTiles.forEach(tile => {
                ctx.fillStyle = "rgba(231, 76, 60, 0.48)";
                ctx.fillRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
                ctx.lineWidth = 2;
                ctx.strokeRect(tile.x * TILE_SIZE + 4, tile.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            });
        }
    } else if (state.previewTargetTiles.length > 0) {
        state.previewTargetTiles.forEach(tile => {
            ctx.fillStyle = "rgba(241, 196, 15, 0.22)";
            ctx.fillRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "rgba(241, 196, 15, 0.65)";
            ctx.lineWidth = 2;
            ctx.strokeRect(tile.x * TILE_SIZE + 3, tile.y * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        });
    } else if (state.hoverTile && state.mode === "IDLE") {
        drawMovementPreview(state, ctx);
    }
}

function drawMovementPreview(state, ctx) {
    const plannedPath = state.player.plannedMove?.path ?? [];

    if (plannedPath.length > 0 && isTile(state.hoverTile, state.player)) {
        drawCancelRouteTile(ctx, state.player.gridX, state.player.gridY);
        return;
    }

    const origin = plannedPath[plannedPath.length - 1] ?? state.player;
    const originX = origin.gridX ?? origin.x;
    const originY = origin.gridY ?? origin.y;
    const availableSteps = getAvailableMoveSteps(state) - plannedPath.length;
    if (availableSteps <= 0) return;

    const path = findPath(state, originX, originY, state.hoverTile.x, state.hoverTile.y);
    if (!path || path.length === 0) return;

    const steps = Math.min(path.length, availableSteps);
    drawPathTiles(ctx, path.slice(0, steps), "rgba(52, 152, 219, 0.32)", steps === path.length ? "rgba(46, 204, 113, 0.45)" : null);
}

function drawCancelRouteTile(ctx, x, y) {
    ctx.fillStyle = "rgba(231, 76, 60, 0.28)";
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
}

function isTile(a, b) {
    return a.x === (b.gridX ?? b.x) && a.y === (b.gridY ?? b.y);
}

function drawPathTiles(ctx, path, fillStyle, finalFillStyle = null) {
    path.forEach((tile, index) => {
        const isFinalTile = finalFillStyle && index === path.length - 1;
        ctx.fillStyle = isFinalTile ? finalFillStyle : fillStyle;
        ctx.fillRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = isFinalTile ? "rgba(236, 240, 241, 0.85)" : "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 2;
        ctx.strokeRect(tile.x * TILE_SIZE + 3, tile.y * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6);
    });
}

function drawEntities(state, ctx) {
    getEntities(state).forEach(entity => drawEntity(state, ctx, entity));
}

function drawEntity(state, ctx, entity) {
    const drawY = entity.pixelY;

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(entity.pixelX + TILE_SIZE / 2, entity.pixelY + TILE_SIZE * 0.75, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = entity.type === "enemy" ? "rgba(192, 57, 43, 0.86)" : "rgba(230, 126, 34, 0.8)";
    ctx.beginPath();
    ctx.arc(entity.pixelX + TILE_SIZE / 2, drawY + TILE_SIZE / 2, TILE_SIZE / 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(entity.icon, entity.pixelX + TILE_SIZE / 2, drawY + TILE_SIZE / 2 + 2);

    if (entity.type === "enemy") {
        const hpPercent = entity.currentHp / entity.stats.maxHp;
        ctx.fillStyle = "#2a0f0f";
        ctx.fillRect(entity.pixelX + 5, drawY - 6, TILE_SIZE - 10, 4);
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(entity.pixelX + 5, drawY - 6, (TILE_SIZE - 10) * Math.max(0, hpPercent), 4);
    } else {
        ctx.fillStyle = "#ffb86c";
        ctx.fillRect(entity.pixelX + 5, drawY - 6, TILE_SIZE - 10, 4);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Arial";
        ctx.fillText(entity.hpLabel, entity.pixelX + TILE_SIZE / 2, drawY - 12);
    }
}

function drawPlayer(state, ctx) {
    const player = state.player;
    const drawY = player.pixelY;

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(player.pixelX + TILE_SIZE / 2, player.pixelY + TILE_SIZE * 0.75, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.pixelX + TILE_SIZE / 2, drawY + TILE_SIZE / 2, TILE_SIZE / 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player.icon, player.pixelX + TILE_SIZE / 2, drawY + TILE_SIZE / 2 + 2);
}

function drawFloatingTexts(state, ctx) {
    ctx.textAlign = "center";
    ctx.font = "bold 18px Arial";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "black";

    for (let index = state.floatingTexts.length - 1; index >= 0; index--) {
        const text = state.floatingTexts[index];
        ctx.fillStyle = text.color;
        ctx.globalAlpha = text.life / 60;
        ctx.strokeText(text.text, text.x, text.y);
        ctx.fillText(text.text, text.x, text.y);
        ctx.globalAlpha = 1;

        text.y -= 1;
        text.life--;
        if (text.life <= 0) state.floatingTexts.splice(index, 1);
    }
}
