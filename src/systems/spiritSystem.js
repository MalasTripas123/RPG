import { ITEMS_DB } from "../data/items.js";
import { addFloatingText } from "./feedback.js";
import {
    getActionDurabilityCost,
    getActionResourceCost,
    getCurrentDurability,
    getPassiveDurabilityCost,
    hasResources,
    refundDurability,
    spendResources,
    spendDurability
} from "./itemRules.js";

export function triggerSpiritPassives(state, combatant, slotId, item, trigger, context = {}) {
    const definition = item ? ITEMS_DB[item.itemId] : null;
    if (!definition || definition.type !== "spirit" || (item.broken && trigger !== "ON_BREAK")) return { broke: false };

    let broke = false;
    const passives = definition.passives?.filter(passive => passive.type === "TRIGGERED" && passive.trigger === trigger) ?? [];

    passives.forEach(passive => {
        if (item.broken && trigger !== "ON_BREAK") return;

        const durabilityCost = getPassiveDurabilityCost(combatant, definition, passive);
        if (durabilityCost > 0 && getCurrentDurability(item) < durabilityCost) return;

        const applied = applyPassiveEffect(state, combatant, slotId, item, definition, passive, context);
        if (!applied) return;

        spendDurability(item, durabilityCost);

        if (getCurrentDurability(item) <= 0) {
            item.broken = true;
            broke = true;
            triggerSpiritPassives(state, combatant, slotId, item, "ON_BREAK", context);
        }
    });

    return { broke };
}

export function triggerEquippedSpiritPassives(state, combatant, trigger, context = {}) {
    const broken = [];

    Object.entries(combatant.inventory?.equipped ?? {}).forEach(([slotId, item]) => {
        const result = triggerSpiritPassives(state, combatant, slotId, item, trigger, context);
        if (result.broke) broken.push({ slotId, item });
    });

    return broken;
}

export function consumePersistentSpiritDurability(state, combatant, slotId, item) {
    const definition = item ? ITEMS_DB[item.itemId] : null;
    if (!definition || definition.type !== "spirit" || item.broken) return { broke: false };

    const passives = definition.passives?.filter(passive => passive.type === "PERSISTENT") ?? [];
    if (passives.length === 0 || item.persistentDurabilityRound === state.round) return { broke: false };

    const durabilityCost = passives.reduce(
        (highest, passive) => Math.max(highest, getPassiveDurabilityCost(combatant, definition, passive)),
        0
    );

    if (durabilityCost <= 0 || getCurrentDurability(item) < durabilityCost) return { broke: false };

    item.persistentDurabilityRound = state.round;
    spendDurability(item, durabilityCost);

    if (combatant.type === "player") {
        addFloatingText(state, `-${durabilityCost} DUR`, combatant.gridX, combatant.gridY, "#9b59b6", -20);
    }

    if (getCurrentDurability(item) <= 0) {
        item.broken = true;
        triggerSpiritPassives(state, combatant, slotId, item, "ON_BREAK", {});
        return { broke: true };
    }

    return { broke: false };
}

export function processEquippedPersistentSpirits(state, combatant) {
    const broken = [];

    Object.entries(combatant.inventory?.equipped ?? {}).forEach(([slotId, item]) => {
        const result = consumePersistentSpiritDurability(state, combatant, slotId, item);
        if (result.broke) broken.push({ slotId, item });
    });

    return broken;
}

function applyPassiveEffect(state, combatant, slotId, item, definition, passive, context) {
    if (passive.effect === "RESTORE_PAD") {
        return restoreResources(state, combatant, { paf: 0, pad: passive.amount });
    }

    if (passive.effect === "RESTORE_RESOURCE") {
        return restoreResources(state, combatant, passive.resources ?? { paf: 0, pad: passive.amount ?? 0 });
    }

    if (passive.effect === "RESTORE_SELF_DURABILITY") {
        refundDurability(item, definition, passive.amount ?? 1);
        addFloatingText(state, `+${passive.amount ?? 1} DUR`, combatant.gridX, combatant.gridY, "#9b59b6", -22);
        return true;
    }

    if (passive.effect === "RESTORE_SOURCE_DURABILITY") {
        const sourceItem = context.sourceItem;
        const sourceDefinition = context.sourceSkill;
        if (!sourceItem || !sourceDefinition?.maxDurability) return false;

        refundDurability(sourceItem, sourceDefinition, passive.amount ?? 1);
        addFloatingText(state, `+${passive.amount ?? 1} DUR`, combatant.gridX, combatant.gridY, "#9b59b6", -22);
        return true;
    }

    if (passive.effect === "RESTORE_EQUIPPED_DURABILITY") {
        let restored = false;

        Object.entries(combatant.inventory?.equipped ?? {}).forEach(([equippedSlotId, equippedItem]) => {
            if (!equippedItem || equippedSlotId === slotId) return;

            const equippedDefinition = ITEMS_DB[equippedItem.itemId];
            if (equippedDefinition?.type !== "spirit" || equippedItem.broken) return;
            const before = getCurrentDurability(equippedItem);
            refundDurability(equippedItem, equippedDefinition, passive.amount ?? 1);
            if (getCurrentDurability(equippedItem) > before) restored = true;
        });

        if (restored) addFloatingText(state, `+${passive.amount ?? 1} DUR`, combatant.gridX, combatant.gridY, "#9b59b6", -22);
        return restored;
    }

    if (passive.effect === "HEAL_SELF") {
        combatant.currentHp = Math.min(combatant.stats.maxHp, combatant.currentHp + passive.amount);
        addFloatingText(state, `+${passive.amount}`, combatant.gridX, combatant.gridY, "#2ecc71", -22);
        return true;
    }

    if (passive.effect === "BONUS_DAMAGE" || passive.effect === "ADD_DAMAGE") {
        context.bonusDamage = (context.bonusDamage ?? 0) + passive.amount;
        return true;
    }

    if (passive.effect === "MULTIPLY_DAMAGE") {
        context.damageMultiplier = (context.damageMultiplier ?? 1) * (passive.multiplier ?? 1);
        return true;
    }

    if (passive.effect === "LOW_DURABILITY_BONUS_DAMAGE") {
        const sourceItem = context.sourceItem ?? item;
        if (getCurrentDurability(sourceItem) > (passive.threshold ?? 1)) return false;

        context.bonusDamage = (context.bonusDamage ?? 0) + (passive.amount ?? 0);
        return true;
    }

    if (passive.effect === "SPEND_RESOURCE_FOR_BONUS_DAMAGE") {
        if (!state.isInCombat) return false;

        const cost = passive.resourceCost ?? { paf: 0, pad: 0 };
        if (!hasResources(combatant, cost)) return false;

        spendResources(combatant, cost);
        context.bonusDamage = (context.bonusDamage ?? 0) + passive.amount;
        addFloatingText(state, `-${formatPassiveCost(cost)}`, combatant.gridX, combatant.gridY, "#3498db", -22);
        return true;
    }

    if (passive.effect === "DUPLICATE_ACTION_COST") {
        const cost = context.sourceCost ?? { paf: 0, pad: 0 };
        if (state.isInCombat && hasResources(combatant, cost)) {
            spendResources(combatant, cost);
            addFloatingText(state, `-${formatPassiveCost(cost)}`, combatant.gridX, combatant.gridY, "#3498db", -22);
        }
        return true;
    }

    if (passive.effect === "ECHO_ACTIVE") {
        if (context.isEcho || !context.sourceAction || !context.sourceSkill || !context.sourceItem) return false;
        if (context.sourceSkill.type !== "spirit" || context.sourceSkill.hasActive === false) return false;

        if ((passive.restoreSourceDurability ?? 0) > 0) {
            refundDurability(context.sourceItem, context.sourceSkill, passive.restoreSourceDurability);
            addFloatingText(state, `+${passive.restoreSourceDurability} DUR`, combatant.gridX, combatant.gridY, "#9b59b6", -22);
        }

        const copiedCost = state.isInCombat
            ? getEchoResourceCost(context.sourceCost ?? getActionResourceCost(combatant, context.sourceSkill))
            : { paf: 0, pad: 0 };
        if (!hasResources(combatant, copiedCost)) return false;

        const durabilityCost = getActionDurabilityCost(combatant, context.sourceSkill);
        if (getCurrentDurability(context.sourceItem) < durabilityCost) return false;

        spendResources(combatant, copiedCost);
        if ((copiedCost.pad ?? 0) > 0) {
            addFloatingText(state, `-${formatPassiveCost(copiedCost)}`, combatant.gridX, combatant.gridY, "#3498db", -22);
        }

        context.extraCasts = context.extraCasts ?? [];
        context.extraCasts.push({
            actorType: context.sourceAction.actorType,
            actorId: context.sourceAction.actorId,
            slotId: context.sourceAction.slotId,
            item: context.sourceItem,
            itemId: context.sourceSkill.id,
            target: { ...context.sourceAction.target },
            label: `${context.sourceSkill.name} (Eco)`,
            isEcho: true,
            reservedCost: copiedCost,
            reservedDurability: 0
        });
        return true;
    }

    return true;
}

function restoreResources(state, combatant, resources) {
    const paf = resources.paf ?? 0;
    const pad = resources.pad ?? 0;
    const previousPaf = combatant.paf;
    const previousPad = combatant.pad;

    combatant.paf = Math.min(combatant.stats.maxPaf, combatant.paf + paf);
    combatant.pad = Math.min(combatant.stats.maxPad, combatant.pad + pad);

    const restored = {
        paf: combatant.paf - previousPaf,
        pad: combatant.pad - previousPad
    };

    if (restored.paf <= 0 && restored.pad <= 0) return false;

    addFloatingText(state, `+${formatPassiveCost(restored)}`, combatant.gridX, combatant.gridY, "#3498db", -22);
    return true;
}

function getEchoResourceCost(cost) {
    return {
        paf: 0,
        pad: cost.pad ?? 0
    };
}

function formatPassiveCost(cost) {
    const parts = [];
    if ((cost.paf ?? 0) > 0) parts.push(`${cost.paf} PAF`);
    if ((cost.pad ?? 0) > 0) parts.push(`${cost.pad} PAD`);
    return parts.join(" + ");
}
