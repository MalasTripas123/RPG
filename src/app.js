import { ITEMS_DB, getRandomSpiritIdsByIdentity } from "./data/items.js";
import { REST_COST } from "./config.js";
import { createGameState } from "./state/createGameState.js";
import { renderCanvas } from "./render/canvasRenderer.js";
import { bindControls } from "./input/controls.js";
import { updateHud } from "./ui/hud.js";
import { renderActionBar } from "./ui/actionBar.js";
import { renderCombatOrderBar } from "./ui/combatOrderBar.js";
import { hideInventoryTooltip, renderInventory } from "./ui/inventoryPanel.js";
import { renderMovementPlanPanel } from "./ui/movementPlanPanel.js";
import { executeSkill, queuePlayerAction, removeQueuedPlayerAction, endPlayerTurn } from "./systems/combatSystem.js";
import { renderActionQueuePanel } from "./ui/actionQueuePanel.js";
import { hideStartMenu, renderStartMenu } from "./ui/startMenu.js";
import { updateDummyCombatState } from "./systems/combatState.js";
import { addDummy, addEnemy, removeLastDummy, removeLastEnemy } from "./systems/entitySystem.js";
import { addFloatingText } from "./systems/feedback.js";
import { calculateRangeTiles, isTileInRange } from "./systems/targeting.js";
import {
    canUseItem,
    getEquippedActions,
    getFormattedCost,
    getItemDurabilityLabel,
    moveItem,
    repairAll
} from "./systems/inventorySystem.js";
import { advanceMovement, startMovement, stopMovement, clearPlannedMove } from "./systems/movementSystem.js";
import { resetPlayerTurn, restoreActionResources } from "./systems/turns.js";
import { increaseCombatantStat } from "./systems/progressionSystem.js";

let state = null;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameContainer = document.getElementById("game-container");
const inventoryModal = document.getElementById("modal-inventory");
const escapeMenu = document.getElementById("escape-menu");
const optionsMenu = document.getElementById("options-menu");
const enemyTurnOverlay = document.getElementById("enemy-turn-overlay");
const testPanel = document.getElementById("test-panel");
const combatToast = document.getElementById("combat-toast");
const invertCameraDragToggle = document.getElementById("toggle-invert-camera-drag");
let combatToastTimeout = null;
let controlsBound = false;
let gameLoopStarted = false;

const actionCallbacks = {
    onActionSelected: toggleActionTargeting,
    onActionPreview: previewActionRange,
    onActionPreviewClear: clearActionPreview,
    onRest: rest,
    onEndTurn: handleEndTurn,
    onToggleInventory: toggleInventory
};

const inventoryCallbacks = {
    onMoveItem(sourceSlotId, targetSlotId) {
        const result = moveItem(state, sourceSlotId, targetSlotId);

        if (result.moved) {
            cancelModes();
            renderInventory(state, inventoryCallbacks);
            if ((result.spentCost?.paf ?? 0) > 0 || (result.spentCost?.pad ?? 0) > 0) {
                addFloatingText(
                    state,
                    `-${getFormattedCost(result.spentCost)}`,
                    state.player.gridX,
                    state.player.gridY,
                    "#3498db",
                    -20
                );
            }
            refreshUi();
        } else {
            addFloatingText(
                state,
                getInventoryMoveError(result.reason),
                state.player.gridX,
                state.player.gridY,
                "#e74c3c",
                -20
            );
        }
    }
};

function getInventoryMoveError(reason) {
    if (reason === "NO_PAD") return "Sin PAD";
    if (reason === "NO_RESOURCES") return "Sin recursos";
    if (reason === "OPPOSITE_IDENTITY") return "Identidad opuesta";
    if (reason === "LOCKED_QUEUED_SPIRIT") return "Espíritu en cola";
    if (reason === "SPIRIT_WALK_PHASE") return "Fase Acción";
    if (reason === "LOCKED_SLOT") return "Ranura bloqueada";
    return "No encaja";
}

const movementPlanCallbacks = {
    onCancelRoute: cancelPlannedRoute
};

const actionQueueCallbacks = {
    onRemoveAction: removeQueuedAction
};

document.getElementById("btn-repair").addEventListener("click", repairInventory);
document.getElementById("btn-close-inventory").addEventListener("click", closeInventory);
document.getElementById("btn-toggle-test-panel").addEventListener("click", toggleTestPanel);
document.getElementById("btn-add-enemy").addEventListener("click", () => addTestEntity("enemy"));
document.getElementById("btn-remove-enemy").addEventListener("click", () => removeTestEntity("enemy"));
document.getElementById("btn-add-dummy").addEventListener("click", () => addTestEntity("dummy"));
document.getElementById("btn-remove-dummy").addEventListener("click", () => removeTestEntity("dummy"));
document.getElementById("btn-set-coins").addEventListener("click", setTestCoins);
document.getElementById("btn-test-rest").addEventListener("click", () => startRest({ free: true }));
document.getElementById("btn-skip-actions").addEventListener("click", toggleActionPlaybackSpeed);
document.getElementById("btn-open-options").addEventListener("click", openOptionsMenu);
document.getElementById("btn-close-escape-menu").addEventListener("click", closeGameMenus);
document.getElementById("btn-back-options").addEventListener("click", openEscapeMenu);
document.querySelectorAll("[data-stat-increase]").forEach(button => {
    button.addEventListener("click", () => increasePlayerStat(button.dataset.statIncrease));
});
invertCameraDragToggle.addEventListener("change", () => {
    if (!state) return;
    state.settings.invertCameraDrag = invertCameraDragToggle.checked;
});

renderStartMenu({
    onWeaponSelected: startGame
});

function startGame(weaponId) {
    const weapon = ITEMS_DB[weaponId];
    const initialSpiritIds = getRandomSpiritIdsByIdentity(weapon.identity, 3);

    state = createGameState({
        weaponId,
        initialSpiritIds,
        bagItemIds: []
    });
    state.settings ??= {};
    state.settings.invertCameraDrag ??= false;

    hideStartMenu();
    bindGameControls();
    updateDummyCombatState(state);
    refreshUi();
    showCombatToast(`ARMA: ${weapon.name}`, "neutral", 1600);

    if (!gameLoopStarted) {
        gameLoopStarted = true;
        requestAnimationFrame(gameLoop);
    }
}

function bindGameControls() {
    if (controlsBound) return;

    bindControls(state, canvas, {
        onMove: startPlayerMovement,
        onTarget: handleTargetClick,
        onCancelModes: cancelModes,
        onEscape: handleEscape,
        onToggleInventory: toggleInventory,
        onEndTurn: handleEndTurn,
        onActionHotkey(index) {
            const action = getEquippedActions(state)[index];
            if (!action) return;
            toggleActionTargeting(action, canUseItem(state, action.item));
        }
    });

    controlsBound = true;
}

function refreshUi() {
    if (!state) return;

    gameContainer.classList.toggle("resting", state.mode === "RESTING");
    updateHud(state);
    renderCombatOrderBar(state);
    renderActionBar(state, actionCallbacks);
    renderMovementPlanPanel(state, movementPlanCallbacks);
    renderActionQueuePanel(state, actionQueueCallbacks);
    updateTestPanelCounts();
    updateOptionsControls();
    if (inventoryModal.classList.contains("active")) renderInventory(state, inventoryCallbacks);
}

function toggleActionTargeting(action, usable) {
    if (state.mode !== "IDLE") return;

    if (state.activeAction?.item.uid === action.item.uid) {
        cancelModes();
        return;
    }

    if (state.isInCombat && state.combatPhase !== "ACTION") {
        addFloatingText(state, "Fase Caminar", state.player.gridX, state.player.gridY, "#f1c40f", -20);
        return;
    }

    if (!usable) {
        addFloatingText(state, getUnavailableActionError(action), state.player.gridX, state.player.gridY, "#e74c3c");
        return;
    }

    cancelModes();
    clearActionPreview();
    state.activeAction = action;
    state.validTargetTiles = calculateRangeTiles(state, ITEMS_DB[action.item.itemId]);
    state.mode = "TARGETING";
    refreshUi();
}

function handleTargetClick(x, y) {
    if (!isTileInRange(state, x, y)) {
        cancelModes();
        return;
    }

    if (state.isInCombat && state.combatPhase === "ACTION") {
        const result = queuePlayerAction(state, state.activeAction, x, y);
        addFloatingText(
            state,
            result.ok ? "Acción en cola" : getQueueActionError(result.reason),
            state.player.gridX,
            state.player.gridY,
            result.ok ? "#f1c40f" : "#e74c3c",
            -20
        );
    } else {
        const result = executeSkill(state, state.activeAction, x, y);
        if (!result.ok) {
            addFloatingText(state, getQueueActionError(result.reason), state.player.gridX, state.player.gridY, "#e74c3c", -20);
        } else {
            handleCombatDistanceChange();
        }
    }

    cancelModes();
    refreshUi();
}

function getQueueActionError(reason) {
    if (reason === "NO_USES") return "Sin usos";
    if (reason === "NO_TARGET") return "Sin objetivo";
    return "Sin recursos";
}

function getUnavailableActionError(action) {
    const item = action.item;
    const definition = ITEMS_DB[item.itemId];
    if (definition.type === "spirit" && (item.broken || getItemDurabilityLabel(item).startsWith("0/"))) return "Sin durabilidad";
    return "Sin recursos";
}

function cancelModes(options = {}) {
    state.activeAction = null;
    state.validTargetTiles = [];
    clearActionPreview();
    if (state.mode === "TARGETING") state.mode = "IDLE";
    if (options.cancelPlannedRoute) clearRoutePlan();
    refreshUi();
}

function previewActionRange(action, usable) {
    if (!shouldPreviewActionRange(usable) || state.mode !== "IDLE") return;

    const origin = getPreviewOrigin();
    state.previewTargetTiles = calculateRangeTiles(state, ITEMS_DB[action.item.itemId], origin);
}

function clearActionPreview() {
    state.previewTargetTiles = [];
}

function shouldPreviewActionRange(usable) {
    if (usable) return true;
    return state.isInCombat && state.combatPhase === "WALK" && state.player.plannedMove?.path?.length > 0;
}

function getPreviewOrigin() {
    const plannedPath = state.player.plannedMove?.path;
    if (state.isInCombat && state.combatPhase === "WALK" && plannedPath?.length > 0) {
        return plannedPath[plannedPath.length - 1];
    }

    return state.player;
}

function startPlayerMovement(x, y) {
    const result = startMovement(state, x, y);
    if (result.reason === "NO_PAD") {
        addFloatingText(state, "Sin PAD", state.player.gridX, state.player.gridY, "#e74c3c");
    } else if (result.reason === "NOT_WALK_PHASE") {
        addFloatingText(state, "Fase Acción", state.player.gridX, state.player.gridY, "#f1c40f");
    } else if (result.cancelled) {
        addFloatingText(state, "Ruta cancelada", state.player.gridX, state.player.gridY, "#aaa", -20);
    } else if (result.adjusted) {
        addFloatingText(state, "Ruta ajustada", state.player.gridX, state.player.gridY, "#3498db", -20);
    } else if (result.extended) {
        addFloatingText(state, result.partial ? "Ruta parcial" : "Ruta extendida", state.player.gridX, state.player.gridY, "#3498db", -20);
    } else if (result.planned) {
        addFloatingText(state, "Ruta lista", state.player.gridX, state.player.gridY, "#3498db", -20);
    } else if (result.started && state.isInCombat) {
        addFloatingText(state, "Sin movimiento", state.player.gridX, state.player.gridY, "#aaa", -20);
    }

    refreshUi();
}

function cancelPlannedRoute() {
    if (!clearRoutePlan()) return;
    refreshUi();
}

function handleEscape() {
    if (optionsMenu.classList.contains("active")) {
        openEscapeMenu();
        return;
    }

    if (escapeMenu.classList.contains("active")) {
        closeGameMenus();
        return;
    }

    if (inventoryModal.classList.contains("active")) {
        closeInventory();
        return;
    }

    if (state.activeAction || state.validTargetTiles.length > 0 || state.player.plannedMove) {
        cancelModes({ cancelPlannedRoute: true });
        return;
    }

    openEscapeMenu();
}

function openEscapeMenu() {
    if (state.mode === "RESTING" || state.mode === "RESOLVING") return;

    closeInventory();
    optionsMenu.classList.remove("active");
    escapeMenu.classList.add("active");
    state.mode = "MENU";
    refreshUi();
}

function openOptionsMenu() {
    if (state.mode === "RESTING" || state.mode === "RESOLVING") return;

    escapeMenu.classList.remove("active");
    optionsMenu.classList.add("active");
    state.mode = "MENU";
    refreshUi();
}

function closeGameMenus() {
    escapeMenu.classList.remove("active");
    optionsMenu.classList.remove("active");
    if (state.mode === "MENU") state.mode = "IDLE";
    refreshUi();
}

function updateOptionsControls() {
    if (!invertCameraDragToggle) return;
    invertCameraDragToggle.checked = Boolean(state.settings.invertCameraDrag);
}

function clearRoutePlan() {
    if (!state.player.plannedMove) return false;

    clearPlannedMove(state);
    addFloatingText(state, "Ruta cancelada", state.player.gridX, state.player.gridY, "#aaa", -20);
    return true;
}

function removeQueuedAction(index) {
    const result = removeQueuedPlayerAction(state, index);
    if (!result.ok) return;

    addFloatingText(state, "Acción retirada", state.player.gridX, state.player.gridY, "#aaa", -20);
    refreshUi();
}

async function handleEndTurn() {
    await endPlayerTurn(state, {
        cancelModes,
        onResolutionStart(text) {
            document.getElementById("enemy-turn-text").innerText = text;
            enemyTurnOverlay.style.display = "flex";
            refreshUi();
        },
        onMovementResolved() {
            handleCombatDistanceChange();
            refreshUi();
        },
        onActionStep() {
            refreshUi();
        },
        onTurnReady() {
            enemyTurnOverlay.style.display = "none";
            refreshUi();
        }
    });

    handleCombatDistanceChange();
    refreshUi();
}

function rest() {
    startRest({ free: false });
}

function startRest({ free }) {
    if (state.mode !== "IDLE") return;

    if (state.isInCombat) {
        showCombatToast("NO PUEDES DESCANSAR EN COMBATE", "danger", 2000);
        addFloatingText(state, "En combate", state.player.gridX, state.player.gridY, "#e74c3c", -20);
        return;
    }

    if (!free && state.player.coins < REST_COST) {
        showCombatToast("POBREZA", "danger", 2000);
        addFloatingText(state, "Sin monedas", state.player.gridX, state.player.gridY, "#e74c3c", -20);
        return;
    }

    if (!free) state.player.coins -= REST_COST;
    cancelModes();
    state.mode = "RESTING";
    showCombatToast("DESCANSANDO", "neutral", 2000);
    refreshUi();

    window.setTimeout(() => {
        if (state.mode !== "RESTING") return;
        finishRest();
    }, 2000);
}

function finishRest() {
    state.player.currentHp = state.player.stats.maxHp;
    resetPlayerTurn(state.player);
    state.mode = "IDLE";
    addFloatingText(state, "Descansado", state.player.gridX, state.player.gridY, "#2ecc71");
    refreshUi();
}

function repairInventory() {
    if (isInteractionLocked()) return;

    const repaired = repairAll(state);
    addFloatingText(
        state,
        repaired ? "Reparados" : "Todo intacto",
        state.player.gridX,
        state.player.gridY,
        repaired ? "#f1c40f" : "#aaa"
    );
    refreshUi();
}

function toggleInventory() {
    if (isInteractionLocked()) return;

    if (inventoryModal.classList.contains("active")) {
        closeInventory();
    } else {
        closeGameMenus();
        cancelModes();
        inventoryModal.classList.add("active");
        state.mode = "MENU";
        refreshUi();
    }
}

function closeInventory() {
    hideInventoryTooltip();
    inventoryModal.classList.remove("active");
    if (state.mode === "MENU") state.mode = "IDLE";
    refreshUi();
}

function increasePlayerStat(stat) {
    if (!state || isInteractionLocked()) return;

    const result = increaseCombatantStat(state.player, stat);
    if (!result.ok) {
        addFloatingText(state, "Sin puntos", state.player.gridX, state.player.gridY, "#aaa", -20);
        return;
    }

    addFloatingText(
        state,
        `+1 ${result.label}`,
        state.player.gridX,
        state.player.gridY,
        "#2ecc71",
        -20
    );
    refreshUi();
}

function gameLoop() {
    const movement = advanceMovement(state);
    if (movement.stepped) {
        handleCombatDistanceChange();
        refreshUi();
    }
    renderCanvas(state, canvas, ctx);
    requestAnimationFrame(gameLoop);
}

function handleCombatDistanceChange() {
    const combatState = updateDummyCombatState(state);
    if (!combatState.changed) return;

    restoreActionResources(state.player);
    state.enemies.forEach(enemy => restoreActionResources(enemy));

    if (combatState.isInCombat) {
        stopMovement(state);
        showCombatToast("COMBATE INICIADO", "danger");
    } else {
        showCombatToast("FUERA DE COMBATE", "neutral");
    }

    addFloatingText(
        state,
        combatState.isInCombat ? "En combate" : "Fuera de combate",
        state.player.gridX,
        state.player.gridY,
        combatState.isInCombat ? "#e74c3c" : "#aaa",
        -24
    );
}

function showCombatToast(message, tone, duration = 1800) {
    if (!combatToast) return;

    window.clearTimeout(combatToastTimeout);
    combatToast.innerText = message;
    combatToast.className = `combat-toast show ${tone}`;
    combatToastTimeout = window.setTimeout(() => {
        combatToast.classList.remove("show");
    }, duration);
}

function toggleTestPanel() {
    if (state.mode === "RESTING") return;
    testPanel.classList.toggle("collapsed");
}

function addTestEntity(type) {
    if (state.mode === "RESTING") return;

    const entity = type === "enemy" ? addEnemy(state) : addDummy(state);
    if (!entity) {
        addFloatingText(state, "Sin espacio", state.player.gridX, state.player.gridY, "#e74c3c", -20);
        return;
    }

    addFloatingText(
        state,
        type === "enemy" ? "Enemigo +" : "Maniquí +",
        entity.gridX,
        entity.gridY,
        type === "enemy" ? "#e74c3c" : "#ffb86c"
    );
    handleCombatDistanceChange();
    refreshUi();
}

function removeTestEntity(type) {
    if (state.mode === "RESTING") return;

    const entity = type === "enemy" ? removeLastEnemy(state) : removeLastDummy(state);
    if (!entity) {
        addFloatingText(state, "Nada que quitar", state.player.gridX, state.player.gridY, "#aaa", -20);
        return;
    }

    addFloatingText(state, "Quitado", state.player.gridX, state.player.gridY, "#aaa", -20);
    handleCombatDistanceChange();
    refreshUi();
}

function updateTestPanelCounts() {
    document.getElementById("enemy-count").innerText = state.enemies.length;
    document.getElementById("dummy-count").innerText = state.dummies.length;
    document.getElementById("coin-count").innerText = state.player.coins;
    updateSkipActionsButton();

    const coinInput = document.getElementById("test-coins-input");
    if (coinInput && document.activeElement !== coinInput) {
        coinInput.value = state.player.coins;
    }
}

function updateSkipActionsButton() {
    const button = document.getElementById("btn-skip-actions");
    if (!button) return;

    const isFast = state.actionPlayback.fast;
    button.innerText = isFast ? "Skip ON" : "Skip OFF";
    button.classList.toggle("active", isFast);
    button.title = isFast ? "Ejecucion rapida activada" : "Ejecucion pausada activada";
}

function setTestCoins() {
    if (state.mode === "RESTING") return;

    const coinInput = document.getElementById("test-coins-input");
    const value = Math.max(0, Math.floor(Number(coinInput.value) || 0));
    state.player.coins = value;
    addFloatingText(state, `${value} monedas`, state.player.gridX, state.player.gridY, "#f1c40f", -20);
    refreshUi();
}

function toggleActionPlaybackSpeed() {
    if (state.mode === "RESTING") return;

    state.actionPlayback.fast = !state.actionPlayback.fast;
    addFloatingText(
        state,
        state.actionPlayback.fast ? "Skip ON" : "Skip OFF",
        state.player.gridX,
        state.player.gridY,
        state.actionPlayback.fast ? "#f1c40f" : "#9fc9ef",
        -20
    );
    refreshUi();
}

function isInteractionLocked() {
    return state.mode === "MOVING" || state.mode === "RESOLVING" || state.mode === "RESTING";
}
