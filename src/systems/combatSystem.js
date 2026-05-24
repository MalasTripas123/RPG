import { COLS, ENEMY_COIN_REWARD_MAX, ENEMY_COIN_REWARD_MIN, ROWS, TILE_SIZE } from "../config.js";
import { ITEMS_DB } from "../data/items.js";
import { addFloatingText } from "./feedback.js";
import { getEntityAt, removeEntity } from "./entitySystem.js";
import { breakSpirit } from "./inventorySystem.js";
import {
    getActionDurabilityCost,
    getActionResourceCost,
    getActionValue,
    getCurrentDurability,
    getPersistentDamageAdd,
    getPersistentDamageMultiplier,
    hasResources,
    refundDurability,
    refundResources,
    spendDurability,
    spendResources
} from "./itemRules.js";
import { getCombatantMoveStepBudget, getCombatantTilePadCost } from "./movementSystem.js";
import { findPath } from "./pathfinding.js";
import {
    processEquippedPersistentSpirits,
    triggerEquippedSpiritPassives,
    triggerSpiritPassives
} from "./spiritSystem.js";
import { getEffectiveSpeed, resetCombatantResources, resetPlayerTurn } from "./turns.js";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function endPlayerTurn(state, callbacks = {}) {
    if (state.mode !== "IDLE" && state.mode !== "TARGETING") return false;

    callbacks.cancelModes?.();

    if (!state.isInCombat) {
        resetPlayerTurn(state.player);
        addFloatingText(state, "Turno listo", state.player.gridX, state.player.gridY, "#3498db", -20);
        callbacks.onTurnReady?.();
        return true;
    }

    if (state.combatPhase === "WALK") {
        state.mode = "RESOLVING";
        callbacks.onResolutionStart?.("RESOLVIENDO MOVIMIENTO");

        planEnemyMovements(state);
        await resolveMovementQueue(state);
        callbacks.onMovementResolved?.();

        if (!state.isInCombat) {
            state.mode = "IDLE";
            callbacks.onTurnReady?.();
            return true;
        }

        state.combatPhase = "ACTION";
        state.mode = "IDLE";
        addFloatingText(state, "Fase Accion", state.player.gridX, state.player.gridY, "#f1c40f", -20);
        callbacks.onTurnReady?.();
        return true;
    }

    state.mode = "RESOLVING";
    callbacks.onResolutionStart?.("RESOLVIENDO ACCIONES");
    state.activeActionCombatantId = null;

    planEnemyActions(state);
    await resolveActionQueue(state, callbacks);

    state.activeActionCombatantId = null;
    resetCombatRound(state);
    state.mode = "IDLE";
    addFloatingText(state, "Fase Caminar", state.player.gridX, state.player.gridY, "#3498db", -20);
    callbacks.onTurnReady?.();
    return true;
}

export function queuePlayerAction(state, action, targetX, targetY) {
    const item = action.item;
    const skill = ITEMS_DB[item.itemId];
    const target = createActionTarget(state, state.player, skill, targetX, targetY);
    let reservedCost = { paf: 0, pad: 0 };
    let reservedDurability = 0;

    if (!target.ok) return target;

    if (state.isInCombat) {
        const useReserve = canReserveItemUse(state.player, item, skill);
        if (!useReserve.ok) return useReserve;

        const reserve = reserveActionCost(state.player, skill);
        if (!reserve.ok) return reserve;
        reservedCost = reserve.cost;

        reservedDurability = reserveItemUse(state.player, item, skill);
    }

    state.player.actionQueue.push({
        actorType: "player",
        slotId: action.slotId,
        item,
        itemId: item.itemId,
        reservedCost,
        reservedDurability,
        target: target.value,
        label: skill.name
    });

    return { ok: true };
}

export function removeQueuedPlayerAction(state, index) {
    if (index < 0 || index >= state.player.actionQueue.length) {
        return { ok: false, reason: "INVALID_INDEX" };
    }

    const [action] = state.player.actionQueue.splice(index, 1);
    const skill = ITEMS_DB[action.itemId];

    if (state.isInCombat) refundActionCost(state.player, action);
    if (action.reservedDurability) refundItemUse(action.item, skill, action.reservedDurability);

    return { ok: true, action };
}

export function executeSkill(state, action, targetX, targetY) {
    const skill = ITEMS_DB[action.item.itemId];
    const target = createActionTarget(state, state.player, skill, targetX, targetY);
    if (!target.ok) return target;

    return executeQueuedAction(state, state.player, {
        actorType: "player",
        slotId: action.slotId,
        item: action.item,
        itemId: action.item.itemId,
        target: target.value,
        label: skill.name
    });
}

function planEnemyMovements(state) {
    state.enemies.forEach(enemy => {
        enemy.plannedMove = null;

        const distance = manhattan(enemy.gridX, enemy.gridY, state.player.gridX, state.player.gridY);
        if (distance <= getBasicAttack(enemy).range) return;

        const path = findPath(state, enemy.gridX, enemy.gridY, state.player.gridX, state.player.gridY, { ignoreTargetBlocker: true });
        if (!path || path.length === 0) return;

        if (path[path.length - 1].x === state.player.gridX && path[path.length - 1].y === state.player.gridY) {
            path.pop();
        }

        const steps = Math.min(getEffectiveSpeed(enemy), getCombatantMoveStepBudget(enemy), path.length);
        enemy.plannedMove = { path: path.slice(0, steps) };
    });
}

async function resolveMovementQueue(state) {
    const combatants = [state.player, ...state.enemies];
    const resolvedPaths = resolveSimultaneousMovementPaths(combatants);
    const movingCombatants = combatants.filter(combatant => resolvedPaths.get(combatant).length > 0);

    combatants.forEach(combatant => {
        const path = resolvedPaths.get(combatant);
        combatant.path = [...path];
        combatant.plannedMove = null;
        combatant.pad = Math.max(0, combatant.pad - path.length * getCombatantTilePadCost(combatant));
    });

    await animateCombatantMovement(movingCombatants);
    tickMovementLocks(combatants);
}

function resolveSimultaneousMovementPaths(combatants) {
    const rankedCombatants = [...combatants].sort(compareMovementPriority);
    const positions = new Map(combatants.map(combatant => [combatant, { x: combatant.gridX, y: combatant.gridY }]));
    const resolvedPaths = new Map(combatants.map(combatant => [combatant, []]));
    const stopped = new Set();
    const plannedPaths = new Map(combatants.map(combatant => [combatant, combatant.plannedMove?.path ?? []]));
    const maxSteps = Math.max(0, ...combatants.map(combatant => plannedPaths.get(combatant).length));

    for (let step = 0; step < maxSteps; step++) {
        const intents = new Map();

        combatants.forEach(combatant => {
            if (stopped.has(combatant)) return;

            const target = plannedPaths.get(combatant)[step];
            if (target) intents.set(combatant, target);
        });

        if (intents.size === 0) break;

        const accepted = getAcceptedMovementIntents(rankedCombatants, positions, intents);

        combatants.forEach(combatant => {
            if (!intents.has(combatant)) return;

            if (!accepted.has(combatant)) {
                stopped.add(combatant);
                return;
            }

            const target = intents.get(combatant);
            resolvedPaths.get(combatant).push(target);
            positions.set(combatant, target);
        });
    }

    return resolvedPaths;
}

function getAcceptedMovementIntents(rankedCombatants, positions, intents) {
    const accepted = new Set(intents.keys());
    const targetClaims = new Map();

    rankedCombatants.forEach(combatant => {
        const target = intents.get(combatant);
        if (!target) return;

        const key = tileKey(target);
        if (targetClaims.has(key)) {
            accepted.delete(combatant);
            return;
        }

        targetClaims.set(key, combatant);
    });

    let changed = true;
    while (changed) {
        changed = false;

        [...accepted].forEach(combatant => {
            const target = intents.get(combatant);
            const occupant = findCombatantAt(positions, target, combatant);
            if (!occupant) return;

            const occupantTarget = intents.get(occupant);
            const occupantMovesAway = accepted.has(occupant) && occupantTarget && !sameTile(occupantTarget, target);
            const swapsWithOccupant = occupantMovesAway && sameTile(occupantTarget, positions.get(combatant));

            if (!occupantMovesAway || swapsWithOccupant) {
                accepted.delete(combatant);
                changed = true;
            }
        });
    }

    return accepted;
}

function compareMovementPriority(a, b) {
    const speedDiff = getEffectiveSpeed(b) - getEffectiveSpeed(a);
    if (speedDiff !== 0) return speedDiff;
    if (a.type === "player") return -1;
    if (b.type === "player") return 1;
    return a.id.localeCompare(b.id);
}

function findCombatantAt(positions, tile, ignoredCombatant) {
    for (const [combatant, position] of positions.entries()) {
        if (combatant === ignoredCombatant) continue;
        if (sameTile(position, tile)) return combatant;
    }

    return null;
}

function sameTile(a, b) {
    return a.x === b.x && a.y === b.y;
}

function tileKey(tile) {
    return `${tile.x},${tile.y}`;
}

function planEnemyActions(state) {
    state.enemies.forEach(enemy => {
        enemy.actionQueue = [];
        const weapon = enemy.inventory.equipped["equip-weapon"];
        if (!weapon) return;

        const skill = ITEMS_DB[weapon.itemId];
        const distance = manhattan(enemy.gridX, enemy.gridY, state.player.gridX, state.player.gridY);
        if (distance > skill.range) return;

        const reserve = reserveActionCost(enemy, skill);
        if (!reserve.ok) return;

        enemy.actionQueue.push({
            actorType: "enemy",
            actorId: enemy.id,
            item: weapon,
            itemId: weapon.itemId,
            reservedCost: reserve.cost,
            reservedDurability: 0,
            target: {
                mode: "UNIT",
                targetId: state.player.id,
                x: state.player.gridX,
                y: state.player.gridY
            },
            label: skill.name
        });
    });
}

async function resolveActionQueue(state, callbacks = {}) {
    const combatants = [state.player, ...state.enemies]
        .filter(combatant => combatant.actionQueue.length > 0)
        .sort((a, b) => getEffectiveSpeed(b) - getEffectiveSpeed(a));

    for (const combatant of combatants) {
        if (!isCombatantActive(state, combatant)) continue;

        const queue = [...combatant.actionQueue];
        combatant.actionQueue = [];
        state.activeActionCombatantId = combatant.id;
        callbacks.onActionStep?.(combatant);

        for (const action of queue) {
            if (!isCombatantActive(state, combatant)) break;
            executeQueuedAction(state, combatant, action);
            callbacks.onActionStep?.(combatant);
            await waitActionPlayback(state);
        }

        breakSpentQueuedSpirits(state, combatant, queue);
    }

    state.activeActionCombatantId = null;
    callbacks.onActionStep?.(null);
}

async function waitActionPlayback(state) {
    const playback = state.actionPlayback ?? {};
    const fastDelay = playback.fastDelayMs ?? 180;

    if (playback.fast) {
        await sleep(fastDelay);
        return;
    }

    const delay = playback.normalDelayMs ?? 1000;
    const deadline = Date.now() + delay;

    while (Date.now() < deadline) {
        if (playback.fast) {
            await sleep(fastDelay);
            return;
        }

        await sleep(Math.min(50, deadline - Date.now()));
    }
}

function isCombatantActive(state, combatant) {
    if (combatant === state.player) return state.player.currentHp > 0;
    if (combatant.currentHp <= 0) return false;
    return state.enemies.some(enemy => enemy.id === combatant.id);
}

function executeQueuedAction(state, actor, action) {
    const skill = ITEMS_DB[action.itemId];
    if (!skill || skill.hasActive === false) return { ok: false, reason: "NO_ACTIVE" };

    const passiveContext = {
        bonusDamage: 0,
        damageMultiplier: 1,
        extraCasts: [],
        sourceAction: action,
        sourceItem: action.item,
        sourceSkill: skill,
        sourceCost: action.reservedCost ?? getActionResourceCost(actor, skill),
        isEcho: Boolean(action.isEcho)
    };

    if (skill.type === "spirit") {
        triggerSpiritPassives(state, actor, action.slotId, action.item, "ON_ACTIVE_EXECUTE", passiveContext);
    }

    settleBrokenSpiritList(state, actor, triggerEquippedSpiritPassives(state, actor, "ON_ANY_ACTIVE_EXECUTE", passiveContext));

    const amount = getResolvedActionAmount(actor, skill, passiveContext);
    let result = { hits: 0 };

    if (skill.effect === "HEAL") {
        result = applyHealAction(state, actor, action, amount);
    } else if (skill.effect === "BUFF_SPEED") {
        actor.speedBonus += amount;
        addFloatingText(state, `+${amount} VEL`, actor.gridX, actor.gridY, "#3498db");
    } else if (skill.effect === "BUFF_DAMAGE") {
        actor.damageAddBonus = (actor.damageAddBonus ?? 0) + amount;
        addFloatingText(state, `+${amount} DAN`, actor.gridX, actor.gridY, "#e67e22");
    } else if (skill.effect === "RESTORE_RESOURCES") {
        result = applyResourceRestoreAction(state, actor, skill);
        if (result.hits > 0) {
            settleBrokenSpiritList(state, actor, triggerEquippedSpiritPassives(state, actor, "ON_ANY_RESOURCE_RESTORE", passiveContext));
        }
    } else if (skill.effect === "RESTORE_DURABILITY") {
        result = applyDurabilityRestoreAction(state, actor, skill);
    } else if (skill.effect === "DAMAGE") {
        result = applyDamageAction(state, actor, action, amount);
    }

    if (skill.type === "spirit" && result.hits > 0) {
        triggerSpiritPassives(state, actor, action.slotId, action.item, "ON_ACTIVE_HIT", passiveContext);
    }

    if (skill.type === "spirit" && skill.effect === "DAMAGE" && result.hits > 0) {
        settleBrokenSpiritList(state, actor, triggerEquippedSpiritPassives(state, actor, "ON_ANY_SPIRIT_DAMAGE", passiveContext));
    }

    if (skill.type === "spirit" && skill.effect === "HEAL" && result.hits > 0) {
        settleBrokenSpiritList(state, actor, triggerEquippedSpiritPassives(state, actor, "ON_ANY_HEAL", passiveContext));
    }

    if (skill.type === "spirit" && !action.reservedDurability) {
        spendDurability(action.item, getActionDurabilityCost(actor, skill));
    }

    if (skill.type === "spirit") {
        settleBrokenSpiritAfterAction(state, actor, action);
    }

    passiveContext.extraCasts.forEach(extraAction => {
        if (!isCombatantActive(state, actor)) return;
        executeQueuedAction(state, actor, extraAction);
    });

    return { ok: true };
}

function getResolvedActionAmount(actor, skill, passiveContext) {
    const baseAmount = getActionValue(actor, skill) + (passiveContext.bonusDamage ?? 0);
    const contextMultiplier = passiveContext.damageMultiplier ?? 1;

    if (skill.effect === "DAMAGE") {
        const damageAdd = getPersistentDamageAdd(actor) + (actor.damageAddBonus ?? 0);
        const damageMultiplier = getPersistentDamageMultiplier(actor) * (actor.damageMultiplierBonus ?? 1);
        return Math.max(0, Math.floor((baseAmount + damageAdd) * damageMultiplier * contextMultiplier));
    }

    if (skill.effect === "HEAL") {
        return Math.max(0, Math.floor(baseAmount * contextMultiplier));
    }

    return Math.max(0, Math.floor(baseAmount));
}

function breakSpentQueuedSpirits(state, actor, queue) {
    if (actor !== state.player) return;

    const spentSpirits = new Map();
    queue
        .filter(action => action.reservedDurability && ITEMS_DB[action.itemId]?.type === "spirit")
        .forEach(action => {
            if (!action.item?.uid || action.item.broken || getCurrentDurability(action.item) > 0) return;
            spentSpirits.set(action.item.uid, action);
        });

    spentSpirits.forEach(action => {
        action.item.broken = true;
        const movedToBag = breakSpirit(state, action.slotId, action.item);
        addFloatingText(
            state,
            movedToBag ? "Roto" : "Mochila llena. Roto.",
            state.player.gridX,
            state.player.gridY,
            "#e74c3c"
        );
    });
}

function applyDamageAction(state, actor, action, amount) {
    const skill = ITEMS_DB[action.itemId];
    const center = resolveActionCenter(state, action);
    if (!center) return { hits: 0 };

    const tiles = getAffectedTiles(center.x, center.y, skill);
    let hits = 0;

    tiles.forEach(({ x, y }) => {
        if (actor.type === "enemy") {
            if (state.player.gridX !== x || state.player.gridY !== y) return;
            state.player.currentHp = Math.max(0, state.player.currentHp - amount);
            addFloatingText(state, `-${amount}`, x, y, "#e74c3c");
            applyActionStatus(state, state.player, skill, x, y);
            hits++;
            return;
        }

        const target = getEntityAt(state, x, y);
        if (!target) return;

        addFloatingText(state, `-${amount}`, x, y, "#e74c3c");
        hits++;

        if (target.type === "dummy") {
            addFloatingText(state, "HP infinito", x, y, "#ffb86c", -24);
            return;
        }

        applyActionStatus(state, target, skill, x, y);
        target.currentHp -= amount;
        if (target.currentHp <= 0) {
            addFloatingText(state, "Derrotado", x, y, "#9b59b6", -24);
            if (removeEntity(state, target) && target.type === "enemy") {
                const reward = getEnemyCoinReward();
                state.player.coins += reward;
                addFloatingText(state, `+${reward} monedas`, x, y, "#f1c40f", -42);
            }
        }
    });

    if (hits === 0) addFloatingText(state, "Fallo", center.x, center.y, "#aaa");
    return { hits };
}

function applyActionStatus(state, target, skill, x, y) {
    if (!skill.status?.preventMovementTurns || !target.stats) return;

    target.movementLockedTurns = Math.max(
        target.movementLockedTurns ?? 0,
        skill.status.preventMovementTurns
    );
    addFloatingText(state, "Anclado", x, y, "#5dade2", -24);
}

function applyHealAction(state, actor, action, amount) {
    const skill = ITEMS_DB[action.itemId];
    const center = resolveActionCenter(state, action);
    if (!center) return { hits: 0 };

    const tiles = getAffectedTiles(center.x, center.y, skill);
    const healed = new Set();

    tiles.forEach(({ x, y }) => {
        const target = getCombatantAtTile(state, x, y);
        if (!target || target.type !== actor.type || !target.stats?.maxHp) return;
        target.currentHp = Math.min(target.stats.maxHp, target.currentHp + amount);
        addFloatingText(state, `+${amount}`, target.gridX, target.gridY, "#2ecc71");
        healed.add(target.id);
    });

    if (healed.size === 0) addFloatingText(state, "Sin objetivo", center.x, center.y, "#aaa");
    return { hits: healed.size };
}

function applyResourceRestoreAction(state, actor, skill) {
    const resources = skill.restores ?? { paf: skill.base ?? 0, pad: 0 };
    const previousPaf = actor.paf;
    const previousPad = actor.pad;

    actor.paf = Math.min(actor.stats.maxPaf, actor.paf + (resources.paf ?? 0));
    actor.pad = Math.min(actor.stats.maxPad, actor.pad + (resources.pad ?? 0));

    const restoredPaf = actor.paf - previousPaf;
    const restoredPad = actor.pad - previousPad;
    if (restoredPaf <= 0 && restoredPad <= 0) {
        addFloatingText(state, "Recursos llenos", actor.gridX, actor.gridY, "#aaa");
        return { hits: 0 };
    }

    addFloatingText(state, `+${formatResourceGain(restoredPaf, restoredPad)}`, actor.gridX, actor.gridY, "#3498db");
    return { hits: 1 };
}

function applyDurabilityRestoreAction(state, actor, skill) {
    const amount = skill.restoreDurabilityAmount ?? skill.base ?? 1;
    let restored = 0;

    Object.values(actor.inventory?.equipped ?? {}).forEach(item => {
        const definition = item ? ITEMS_DB[item.itemId] : null;
        if (!definition || definition.type !== "spirit" || item.broken) return;

        const before = getCurrentDurability(item);
        refundDurability(item, definition, amount);
        if (getCurrentDurability(item) > before) restored++;
    });

    addFloatingText(
        state,
        restored > 0 ? `+${amount} DUR` : "Durabilidad llena",
        actor.gridX,
        actor.gridY,
        restored > 0 ? "#9b59b6" : "#aaa"
    );

    return { hits: restored };
}

function createActionTarget(state, actor, skill, x, y) {
    if (!skill || skill.hasActive === false) return { ok: false, reason: "NO_ACTIVE" };

    if (skill.targetMode === "SELF") {
        return {
            ok: true,
            value: { mode: "SELF", targetId: actor.id, x: actor.gridX, y: actor.gridY }
        };
    }

    if (skill.targetMode === "UNIT") {
        const target = getCombatantAtTile(state, x, y);
        if (!target) return { ok: false, reason: "NO_TARGET" };

        return {
            ok: true,
            value: { mode: "UNIT", targetId: target.id, x, y }
        };
    }

    return {
        ok: true,
        value: { mode: "TILE", x, y }
    };
}

function resolveActionCenter(state, action) {
    if (action.target.mode === "SELF" || action.target.mode === "UNIT") {
        const target = getCombatantById(state, action.target.targetId);
        if (target) return { x: target.gridX, y: target.gridY };
    }

    return { x: action.target.x, y: action.target.y };
}

function getAffectedTiles(centerX, centerY, skill) {
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

function getCombatantAtTile(state, x, y) {
    if (state.player.gridX === x && state.player.gridY === y) return state.player;
    return getEntityAt(state, x, y);
}

function getCombatantById(state, id) {
    if (state.player.id === id) return state.player;
    return [...state.enemies, ...state.dummies].find(entity => entity.id === id) ?? null;
}

function reserveActionCost(combatant, skill) {
    const cost = getActionResourceCost(combatant, skill);

    if (!hasResources(combatant, cost)) {
        return { ok: false, reason: "NO_RESOURCES" };
    }

    spendResources(combatant, cost);
    return { ok: true, cost };
}

function refundActionCost(combatant, action) {
    refundResources(combatant, action.reservedCost ?? { paf: 0, pad: 0 });
}

function canReserveItemUse(combatant, item, skill) {
    if (skill.hasActive === false) return { ok: false, reason: "NO_ACTIVE" };
    if (skill.type !== "spirit") return { ok: true };
    if (item.broken) return { ok: false, reason: "NO_USES" };
    if (getCurrentDurability(item) < getActionDurabilityCost(combatant, skill)) {
        return { ok: false, reason: "NO_USES" };
    }
    return { ok: true };
}

function reserveItemUse(combatant, item, skill) {
    if (skill.type !== "spirit") return 0;
    const durabilityCost = getActionDurabilityCost(combatant, skill);
    spendDurability(item, durabilityCost);
    return durabilityCost;
}

function refundItemUse(item, skill, amount) {
    if (!item || skill.type !== "spirit" || item.broken) return;
    refundDurability(item, skill, amount);
}

function settleBrokenSpiritAfterAction(state, actor, action) {
    if (!action.item) return;
    if (action.reservedDurability && !action.item.broken) return;
    if (!action.item.broken && getCurrentDurability(action.item) > 0) return;

    action.item.broken = true;
    if (actor !== state.player) return;

    const movedToBag = breakSpirit(state, action.slotId, action.item);
    addFloatingText(
        state,
        movedToBag ? "Roto" : "Mochila llena. Roto.",
        state.player.gridX,
        state.player.gridY,
        "#e74c3c"
    );
}

function resetCombatRound(state) {
    resetCombatantResources(state.player);
    state.enemies.forEach(enemy => resetCombatantResources(enemy));
    state.round++;
    state.combatPhase = "WALK";
    processRoundStartPersistentSpirits(state);
}

function processRoundStartPersistentSpirits(state) {
    processEquippedPersistentSpirits(state, state.player).forEach(({ slotId, item }) => {
        settleBrokenSpirit(state, slotId, item);
    });
    triggerEquippedSpiritPassives(state, state.player, "ON_ROUND_START").forEach(({ slotId, item }) => {
        settleBrokenSpirit(state, slotId, item);
    });

    state.enemies.forEach(enemy => {
        processEquippedPersistentSpirits(state, enemy);
        triggerEquippedSpiritPassives(state, enemy, "ON_ROUND_START");
    });
}

function settleBrokenSpirit(state, slotId, item) {
    if (!item?.broken) return;

    const movedToBag = breakSpirit(state, slotId, item);
    addFloatingText(
        state,
        movedToBag ? "Roto" : "Mochila llena. Roto.",
        state.player.gridX,
        state.player.gridY,
        "#e74c3c"
    );
}

function settleBrokenSpiritList(state, actor, brokenSpirits) {
    if (actor !== state.player) return;

    brokenSpirits.forEach(({ slotId, item }) => {
        settleBrokenSpirit(state, slotId, item);
    });
}

function getBasicAttack(combatant) {
    const weapon = combatant.inventory.equipped["equip-weapon"];
    return ITEMS_DB[weapon.itemId];
}

function animateCombatantMovement(combatants) {
    return new Promise(resolve => {
        function loop() {
            let anyMoving = false;

            combatants.forEach(combatant => {
                if (combatant.path.length === 0) return;
                anyMoving = true;
                advanceCombatantStep(combatant);
            });

            if (!anyMoving) {
                resolve();
                return;
            }

            requestAnimationFrame(loop);
        }

        loop();
    });
}

function advanceCombatantStep(combatant) {
    const target = combatant.path[0];
    const targetX = target.x * TILE_SIZE;
    const targetY = target.y * TILE_SIZE;
    let reachedX = false;
    let reachedY = false;

    if (combatant.pixelX < targetX) {
        combatant.pixelX += Math.min(5, targetX - combatant.pixelX);
    } else if (combatant.pixelX > targetX) {
        combatant.pixelX -= Math.min(5, combatant.pixelX - targetX);
    } else {
        reachedX = true;
    }

    if (combatant.pixelY < targetY) {
        combatant.pixelY += Math.min(5, targetY - combatant.pixelY);
    } else if (combatant.pixelY > targetY) {
        combatant.pixelY -= Math.min(5, combatant.pixelY - targetY);
    } else {
        reachedY = true;
    }

    if (reachedX && reachedY) {
        combatant.gridX = target.x;
        combatant.gridY = target.y;
        combatant.path.shift();
    }
}

function manhattan(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function getEnemyCoinReward() {
    return ENEMY_COIN_REWARD_MIN + Math.floor(Math.random() * (ENEMY_COIN_REWARD_MAX - ENEMY_COIN_REWARD_MIN + 1));
}

function tickMovementLocks(combatants) {
    combatants.forEach(combatant => {
        if ((combatant.movementLockedTurns ?? 0) > 0) {
            combatant.movementLockedTurns--;
        }
    });
}

function formatResourceGain(paf, pad) {
    const parts = [];
    if (paf > 0) parts.push(`${paf} PAF`);
    if (pad > 0) parts.push(`${pad} PAD`);
    return parts.join(" + ");
}
