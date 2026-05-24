import { COLS, ROWS, TILE_SIZE } from "../config.js";
import { ITEMS_DB } from "../data/items.js";
import { getHeightOffset } from "../data/world.js";
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
    if (type === 1) {
        ctx.fillStyle = "#222";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    } else if (type === 0) {
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    } else if (type === 2) {
        ctx.fillStyle = "#34495e";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(px, py, TILE_SIZE, 3);
        ctx.fillRect(px, py, 3, TILE_SIZE);
    } else if (type === 5) {
        ctx.fillStyle = "#455a64";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(px, py, TILE_SIZE, 3);
        ctx.fillRect(px, py, 3, TILE_SIZE);
    } else if (type === 3 || type === 6) {
        ctx.fillStyle = "#1a252f";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + 12, py);
        ctx.lineTo(px + 12, py + TILE_SIZE);
        ctx.moveTo(px + 38, py);
        ctx.lineTo(px + 38, py + TILE_SIZE);
        ctx.stroke();
    } else if (type === 4 || type === 7) {
        ctx.fillStyle = "#3e2723";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(px + 6, py + 6, TILE_SIZE - 12, 10);
        ctx.fillRect(px + 6, py + 20, TILE_SIZE - 12, 10);
        ctx.fillRect(px + 6, py + 34, TILE_SIZE - 12, 10);
    }

    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
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
    const offset = getHeightOffset(state.map[entity.gridY][entity.gridX]);
    const drawY = entity.pixelY - offset;

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
    const offset = getHeightOffset(state.map[player.gridY][player.gridX]);
    const drawY = player.pixelY - offset;

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
