import { ITEMS_DB } from "../data/items.js";
import { getCurrentDurability, getEffectiveStat, refundDurability } from "./itemRules.js";

export function resetPlayerTurn(player) {
    player.speedBonus = 0;
    restoreActionResources(player);
}

export function restoreActionResources(player) {
    resetCombatantResources(player);
}

export function canPlayerAct(state) {
    return state.mode === "IDLE" || state.mode === "TARGETING";
}

export function getEffectiveSpeed(combatant) {
    return getEffectiveStat(combatant, "speed") + (combatant.speedBonus ?? 0);
}

export function resetCombatantResources(combatant) {
    refundQueuedItemUses(combatant);
    combatant.speedBonus = 0;
    combatant.damageAddBonus = 0;
    combatant.damageMultiplierBonus = 1;
    combatant.paf = combatant.stats.maxPaf;
    combatant.pad = combatant.stats.maxPad;
    combatant.actionQueue = [];
    combatant.plannedMove = null;
}

function refundQueuedItemUses(combatant) {
    combatant.actionQueue?.forEach(action => {
        const definition = ITEMS_DB[action.itemId];
        if (!action.reservedDurability || definition?.type !== "spirit" || !action.item || action.item.broken) return;
        if (getCurrentDurability(action.item) >= definition.maxDurability) return;
        refundDurability(action.item, definition, action.reservedDurability);
    });
}
