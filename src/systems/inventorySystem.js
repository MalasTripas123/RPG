import { ITEMS_DB } from "../data/items.js";
import {
    canEquipSpiritForCombatant,
    formatResourceCost,
    getActionResourceCost,
    getCurrentDurability,
    getEquipResourceCost,
    hasResources,
    spendResources
} from "./itemRules.js";
import {
    consumePersistentSpiritDurability,
    triggerSpiritPassives
} from "./spiritSystem.js";
import {
    MAX_SPIRIT_SLOTS,
    getSpiritSlotNumber,
    isSpiritSlotUnlocked
} from "./progressionSystem.js";

export function getItemDefinition(item) {
    return item ? ITEMS_DB[item.itemId] : null;
}

export function getEquippedActions(state) {
    return getCombatantEquippedActions(state.player);
}

export function getCombatantEquippedActions(combatant) {
    return [
        ...getCombatantWeaponActions(combatant),
        ...getCombatantActiveSpiritActions(combatant)
    ];
}

export function getEquippedWeaponActions(state) {
    return getCombatantWeaponActions(state.player);
}

export function getEquippedActiveSpiritActions(state) {
    return getCombatantActiveSpiritActions(state.player);
}

export function getEquippedPassiveSpirits(state) {
    return getCombatantPassiveSpirits(state.player);
}

function getCombatantWeaponActions(combatant) {
    const equipped = combatant.inventory.equipped;
    const actions = [];

    if (equipped["equip-weapon"]) {
        actions.push({ slotId: "equip-weapon", item: equipped["equip-weapon"] });
    }

    return actions;
}

function getCombatantActiveSpiritActions(combatant) {
    const equipped = combatant.inventory.equipped;
    const actions = [];

    for (let index = 1; index <= getEquippedSpiritSlotLimit(combatant); index++) {
        const slotId = `equip-spirit-${index}`;
        const item = equipped[slotId];
        const definition = getItemDefinition(item);
        if (item && definition?.hasActive !== false) actions.push({ slotId, item });
    }

    return actions;
}

function getCombatantPassiveSpirits(combatant) {
    const equipped = combatant.inventory.equipped;
    const spirits = [];

    for (let index = 1; index <= getEquippedSpiritSlotLimit(combatant); index++) {
        const slotId = `equip-spirit-${index}`;
        const item = equipped[slotId];
        const definition = getItemDefinition(item);
        if (item && definition?.type === "spirit" && definition.hasActive === false) {
            spirits.push({ slotId, item });
        }
    }

    return spirits;
}

export function getSlotItem(state, slotId) {
    if (slotId.startsWith("bag-")) {
        return state.player.inventory.bag[Number(slotId.split("-")[1])] ?? null;
    }

    return state.player.inventory.equipped[slotId] ?? null;
}

export function setSlotItem(state, slotId, item) {
    if (slotId.startsWith("bag-")) {
        state.player.inventory.bag[Number(slotId.split("-")[1])] = item;
        return;
    }

    state.player.inventory.equipped[slotId] = item;
}

export function canPlaceItemInSlot(item, slotId) {
    if (!item) return true;
    if (slotId.startsWith("bag-")) return true;
    if (slotId.startsWith("equip-weapon")) return getItemDefinition(item).type === "weapon";
    if (slotId.startsWith("equip-spirit")) return getItemDefinition(item).type === "spirit" && !item.broken;
    return false;
}

export function moveItem(state, sourceSlotId, targetSlotId) {
    if (!sourceSlotId || !targetSlotId || sourceSlotId === targetSlotId) return { moved: false, reason: "NOOP" };

    const sourceItem = getSlotItem(state, sourceSlotId);
    const targetItem = getSlotItem(state, targetSlotId);

    if (!sourceItem) return { moved: false, reason: "EMPTY_SOURCE" };
    if (touchesSpiritWalkPhase(state, sourceSlotId, targetSlotId, sourceItem, targetItem)) {
        return { moved: false, reason: "SPIRIT_WALK_PHASE" };
    }
    if (touchesQueuedSpiritAction(state, sourceSlotId, targetSlotId, sourceItem, targetItem)) {
        return { moved: false, reason: "LOCKED_QUEUED_SPIRIT" };
    }
    if (isLockedSpiritEquipmentSlot(state, sourceSlotId) || isLockedSpiritEquipmentSlot(state, targetSlotId)) {
        return { moved: false, reason: "LOCKED_SLOT" };
    }
    if (!canPlaceItemInSlot(sourceItem, targetSlotId)) return { moved: false, reason: "INVALID_TARGET" };
    if (!canPlaceItemInSlot(targetItem, sourceSlotId)) return { moved: false, reason: "INVALID_SWAP" };
    if (!canEquipTargetSpirit(state, targetSlotId, sourceItem)) return { moved: false, reason: "OPPOSITE_IDENTITY" };

    const equipCost = getCombatEquipCost(state, sourceSlotId, targetSlotId, sourceItem);
    if (!hasResources(state.player, equipCost)) return { moved: false, reason: "NO_RESOURCES" };

    setSlotItem(state, targetSlotId, sourceItem);
    setSlotItem(state, sourceSlotId, targetItem);
    spendResources(state.player, equipCost);
    resolveEquipmentPassives(state, sourceSlotId, targetSlotId, sourceItem, targetItem);

    return { moved: true, spentCost: equipCost };
}

export function findEmptyBagSlot(state) {
    return state.player.inventory.bag.findIndex(item => item === null);
}

export function breakSpirit(state, slotId, item) {
    if (!item) return false;

    item.broken = true;
    if (state.player.inventory.bag.some(bagItem => bagItem?.uid === item.uid)) {
        if (state.player.inventory.equipped[slotId]?.uid === item.uid) {
            state.player.inventory.equipped[slotId] = null;
        }
        return true;
    }

    const emptySlot = findEmptyBagSlot(state);

    if (emptySlot !== -1) {
        state.player.inventory.bag[emptySlot] = item;
        if (state.player.inventory.equipped[slotId]?.uid === item.uid) {
            state.player.inventory.equipped[slotId] = null;
        }
        return true;
    }

    return false;
}

export function repairAll(state) {
    let repaired = false;

    forEachInventoryItem(state, item => {
        const definition = getItemDefinition(item);
        if (definition.type !== "spirit") return;

        if (item.broken || getCurrentDurability(item) < definition.maxDurability) {
            item.durability = definition.maxDurability;
            item.broken = false;
            item.persistentDurabilityRound = null;
            repaired = true;
        }
    });

    return repaired;
}

export function forEachInventoryItem(state, callback) {
    Object.values(state.player.inventory.equipped).forEach(item => {
        if (item) callback(item);
    });

    state.player.inventory.bag.forEach(item => {
        if (item) callback(item);
    });
}

export function canUseItem(state, item) {
    const definition = getItemDefinition(item);
    if (!definition || definition.hasActive === false) return false;
    if (definition.type === "spirit") {
        if (!canEquipSpiritForCombatant(state.player, item)) return false;
        if (item.broken || getCurrentDurability(item) <= 0) return false;
    }
    if (!state.isInCombat) return true;
    if (state.combatPhase !== "ACTION") return false;
    return hasResources(state.player, getActionResourceCost(state.player, definition));
}

export function getItemDurabilityLabel(item) {
    const definition = getItemDefinition(item);
    if (!definition || definition.type !== "spirit") return "";
    return `${getCurrentDurability(item)}/${definition.maxDurability}`;
}

export function getPlayerActionResourceCost(state, item) {
    return getActionResourceCost(state.player, getItemDefinition(item));
}

export function getPlayerEquipResourceCost(state, item) {
    return getEquipResourceCost(state.player, item);
}

export function getFormattedCost(cost) {
    return formatResourceCost(cost);
}

function getCombatEquipCost(state, sourceSlotId, targetSlotId, sourceItem) {
    if (!state.isInCombat || state.combatPhase !== "ACTION") return { paf: 0, pad: 0 };
    if (!targetSlotId.startsWith("equip-spirit")) return { paf: 0, pad: 0 };
    if (sourceSlotId.startsWith("equip-spirit")) return { paf: 0, pad: 0 };

    const sourceDefinition = getItemDefinition(sourceItem);
    return sourceDefinition.type === "spirit" ? getEquipResourceCost(state.player, sourceItem) : { paf: 0, pad: 0 };
}

function canEquipTargetSpirit(state, targetSlotId, sourceItem) {
    if (!targetSlotId.startsWith("equip-spirit")) return true;
    return canEquipSpiritForCombatant(state.player, sourceItem);
}

function resolveEquipmentPassives(state, sourceSlotId, targetSlotId, sourceItem, targetItem) {
    if (!state.isInCombat || state.combatPhase !== "ACTION") return;

    if (targetSlotId.startsWith("equip-spirit") && !sourceSlotId.startsWith("equip-spirit")) {
        triggerSpiritPassives(state, state.player, targetSlotId, sourceItem, "ON_EQUIP_COMBAT");
        consumePersistentSpiritDurability(state, state.player, targetSlotId, sourceItem);
        settleBrokenSpirit(state, targetSlotId, sourceItem);
    }

    if (targetItem && targetSlotId.startsWith("equip-spirit") && !sourceSlotId.startsWith("equip-spirit")) {
        triggerSpiritPassives(state, state.player, sourceSlotId, targetItem, "ON_UNEQUIP_COMBAT");
        consumePersistentSpiritDurability(state, state.player, sourceSlotId, targetItem);
        settleBrokenSpirit(state, sourceSlotId, targetItem);
        return;
    }

    if (sourceSlotId.startsWith("equip-spirit") && !targetSlotId.startsWith("equip-spirit")) {
        triggerSpiritPassives(state, state.player, targetSlotId, sourceItem, "ON_UNEQUIP_COMBAT");
        consumePersistentSpiritDurability(state, state.player, targetSlotId, sourceItem);
        settleBrokenSpirit(state, targetSlotId, sourceItem);
    }
}

function settleBrokenSpirit(state, slotId, item) {
    if (item?.broken) breakSpirit(state, slotId, item);
}

export function isSlotLockedByQueuedSpirit(state, slotId) {
    return getQueuedSpiritLocks(state).slotIds.has(slotId);
}

export function isItemLockedByQueuedSpirit(state, item) {
    return Boolean(item && getQueuedSpiritLocks(state).itemUids.has(item.uid));
}

export function isSpiritLockedByWalkPhase(state, slotId, item) {
    if (!state.isInCombat || state.combatPhase !== "WALK") return false;
    return isSpiritSlot(slotId) || isSpiritItem(item);
}

function touchesQueuedSpiritAction(state, sourceSlotId, targetSlotId, sourceItem, targetItem) {
    const locks = getQueuedSpiritLocks(state);
    if (locks.slotIds.size === 0 && locks.itemUids.size === 0) return false;

    return (
        locks.slotIds.has(sourceSlotId) ||
        locks.slotIds.has(targetSlotId) ||
        locks.itemUids.has(sourceItem?.uid) ||
        locks.itemUids.has(targetItem?.uid)
    );
}

function getQueuedSpiritLocks(state) {
    const slotIds = new Set();
    const itemUids = new Set();

    if (!state.isInCombat || state.combatPhase !== "ACTION") return { slotIds, itemUids };

    state.player.actionQueue
        .filter(action => ITEMS_DB[action.itemId]?.type === "spirit")
        .forEach(action => {
            if (action.slotId?.startsWith("equip-spirit")) slotIds.add(action.slotId);
            if (action.item?.uid) itemUids.add(action.item.uid);
        });

    return { slotIds, itemUids };
}

function touchesSpiritWalkPhase(state, sourceSlotId, targetSlotId, sourceItem, targetItem) {
    if (!state.isInCombat || state.combatPhase !== "WALK") return false;
    return (
        isSpiritSlot(sourceSlotId) ||
        isSpiritSlot(targetSlotId) ||
        isSpiritItem(sourceItem) ||
        isSpiritItem(targetItem)
    );
}

function isSpiritSlot(slotId) {
    return slotId?.startsWith("equip-spirit");
}

function isSpiritItem(item) {
    return getItemDefinition(item)?.type === "spirit";
}

export function isLockedSpiritEquipmentSlot(state, slotId) {
    if (!getSpiritSlotNumber(slotId)) return false;
    return !isSpiritSlotUnlocked(state.player.stats, slotId);
}

function getEquippedSpiritSlotLimit(combatant) {
    return Math.min(MAX_SPIRIT_SLOTS, combatant.stats?.maxSpiritSlots ?? MAX_SPIRIT_SLOTS);
}
