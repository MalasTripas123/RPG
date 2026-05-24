import { MOVE_SPEED, PAD_COST_PER_TILE, TILE_SIZE } from "../config.js";
import {
    getMovementPadCostMultiplier,
    getMovementStepPenalty,
    isMovementPrevented
} from "./itemRules.js";
import { findPath } from "./pathfinding.js";
import { getEffectiveSpeed } from "./turns.js";

export function getAvailableMoveSteps(state) {
    if (!state.isInCombat) return Number.POSITIVE_INFINITY;
    if (state.combatPhase !== "WALK") return 0;

    const stepsByPad = getCombatantMoveStepBudget(state.player);
    return Math.min(getEffectiveSpeed(state.player), stepsByPad);
}

export function getCombatantMoveStepBudget(combatant) {
    if (isMovementPrevented(combatant)) return 0;

    const movementPadCap = combatant.stats.maxPad / 2;
    const availableMovementPad = Math.min(combatant.pad, movementPadCap);
    const stepBudget = Math.floor(availableMovementPad / getCombatantTilePadCost(combatant));
    return Math.max(0, stepBudget - getMovementStepPenalty(combatant));
}

export function getCombatantTilePadCost(combatant) {
    return PAD_COST_PER_TILE * getMovementPadCostMultiplier(combatant);
}

export function startMovement(state, x, y) {
    if (state.isInCombat && state.combatPhase !== "WALK") return { started: false, reason: "NOT_WALK_PHASE" };

    if (state.isInCombat) return planCombatMovement(state, x, y);

    const path = findPath(state, state.player.gridX, state.player.gridY, x, y);
    if (!path || path.length === 0) return { started: false, reason: "NO_PATH" };

    state.player.path = path;
    state.mode = "MOVING";
    return { started: true };
}

function planCombatMovement(state, x, y) {
    const currentRoute = state.player.plannedMove?.path ?? [];

    if (x === state.player.gridX && y === state.player.gridY) {
        clearPlannedMove(state);
        return { started: true, cancelled: currentRoute.length > 0 };
    }

    const existingIndex = currentRoute.findIndex(tile => tile.x === x && tile.y === y);
    if (existingIndex !== -1) {
        const path = currentRoute.slice(0, existingIndex + 1);
        state.player.plannedMove = { path, target: { x, y } };
        return { started: true, planned: true, adjusted: true };
    }

    const maxSteps = getAvailableMoveSteps(state);
    if (maxSteps <= 0) return { started: false, reason: "NO_PAD" };

    const remainingSteps = maxSteps - currentRoute.length;
    if (remainingSteps <= 0) return { started: false, reason: "NO_PAD" };

    const origin = currentRoute[currentRoute.length - 1] ?? state.player;
    const path = findPath(state, origin.gridX ?? origin.x, origin.gridY ?? origin.y, x, y);
    if (!path || path.length === 0) return { started: false, reason: "NO_PATH" };

    const extension = path.slice(0, remainingSteps);
    const plannedPath = [...currentRoute, ...extension];
    state.player.plannedMove = { path: plannedPath, target: plannedPath[plannedPath.length - 1] };

    return {
        started: true,
        planned: true,
        extended: currentRoute.length > 0,
        partial: extension.length < path.length
    };
}

export function advanceMovement(state) {
    if (state.mode !== "MOVING") return { stepped: false };

    if (state.player.path.length === 0) {
        state.mode = "IDLE";
        return { stepped: false };
    }

    const target = state.player.path[0];
    const targetX = target.x * TILE_SIZE;
    const targetY = target.y * TILE_SIZE;
    let reachedX = false;
    let reachedY = false;

    if (state.player.pixelX < targetX) {
        state.player.pixelX += Math.min(MOVE_SPEED, targetX - state.player.pixelX);
    } else if (state.player.pixelX > targetX) {
        state.player.pixelX -= Math.min(MOVE_SPEED, state.player.pixelX - targetX);
    } else {
        reachedX = true;
    }

    if (state.player.pixelY < targetY) {
        state.player.pixelY += Math.min(MOVE_SPEED, targetY - state.player.pixelY);
    } else if (state.player.pixelY > targetY) {
        state.player.pixelY -= Math.min(MOVE_SPEED, state.player.pixelY - targetY);
    } else {
        reachedY = true;
    }

    if (!reachedX || !reachedY) return { stepped: false };

    state.player.gridX = target.x;
    state.player.gridY = target.y;
    state.player.path.shift();
    if (state.isInCombat) {
        state.player.pad = Math.max(0, state.player.pad - getCombatantTilePadCost(state.player));
    }

    if ((state.isInCombat && state.player.pad < getCombatantTilePadCost(state.player)) || state.player.path.length === 0) {
        state.mode = "IDLE";
    }

    return { stepped: true };
}

export function stopMovement(state) {
    state.player.path = [];
    state.player.plannedMove = null;
    if (state.mode === "MOVING") state.mode = "IDLE";
}

export function clearPlannedMove(state) {
    state.player.plannedMove = null;
}

export function getPlannedMoveCost(state) {
    return (state.player.plannedMove?.path?.length ?? 0) * getCombatantTilePadCost(state.player);
}
