import { IDENTITY_LABELS, getIdentityAffinity } from "../data/combatIdentities.js";
import { ITEMS_DB } from "../data/items.js";

export function getCombatantIdentity(combatant) {
    const weapon = combatant.inventory?.equipped?.["equip-weapon"];
    const weaponDefinition = weapon ? ITEMS_DB[weapon.itemId] : null;
    return weaponDefinition?.identity ?? "WHITE";
}

export function getSpiritAffinity(combatant, spiritDefinition) {
    return getIdentityAffinity(getCombatantIdentity(combatant), spiritDefinition.identity);
}

export function canEquipSpiritForCombatant(combatant, item) {
    const definition = item ? ITEMS_DB[item.itemId] : null;
    if (!definition || definition.type !== "spirit") return true;
    return getSpiritAffinity(combatant, definition).canEquip;
}

export function getActionResourceCost(combatant, definition) {
    if (!definition || definition.hasActive === false) return { paf: 0, pad: 0 };

    const affinityCost = getScaledCost(
        definition.costs ?? legacyCosts(definition.cost),
        getResourceMultiplier(combatant, definition)
    );

    return getScaledCost(affinityCost, getActionCostMultiplier(combatant, definition));
}

export function getEquipResourceCost(combatant, item) {
    const definition = item ? ITEMS_DB[item.itemId] : null;
    if (!definition || definition.type !== "spirit") return { paf: 0, pad: 0 };
    return { ...(definition.equipCost ?? { paf: 0, pad: 1 }) };
}

export function getActionDurabilityCost(combatant, definition) {
    if (definition.type !== "spirit") return 0;
    const baseCost = definition.durabilityCost ?? 1;
    if (baseCost <= 0) return 0;
    return Math.max(1, baseCost * getDurabilityMultiplier(combatant, definition));
}

export function getPassiveDurabilityCost(combatant, definition, passive) {
    if (definition.type !== "spirit") return 0;
    const baseCost = passive.durabilityCost ?? 1;
    if (baseCost <= 0) return 0;
    return Math.max(1, baseCost * getDurabilityMultiplier(combatant, definition));
}

export function hasResources(combatant, costs) {
    return combatant.paf >= (costs.paf ?? 0) && combatant.pad >= (costs.pad ?? 0);
}

export function spendResources(combatant, costs) {
    combatant.paf -= costs.paf ?? 0;
    combatant.pad -= costs.pad ?? 0;
}

export function refundResources(combatant, costs) {
    combatant.paf = Math.min(combatant.stats.maxPaf, combatant.paf + (costs.paf ?? 0));
    combatant.pad = Math.min(combatant.stats.maxPad, combatant.pad + (costs.pad ?? 0));
}

export function getCurrentDurability(item) {
    return item?.durability ?? item?.uses ?? 0;
}

export function setCurrentDurability(item, value) {
    if (!item) return;
    item.durability = Math.max(0, value);
}

export function spendDurability(item, amount) {
    if (!item || amount <= 0) return;
    setCurrentDurability(item, getCurrentDurability(item) - amount);
}

export function refundDurability(item, definition, amount) {
    if (!item || amount <= 0) return;
    setCurrentDurability(item, Math.min(definition.maxDurability, getCurrentDurability(item) + amount));
}

export function getEffectiveStat(combatant, stat) {
    const base = combatant.stats?.[stat] ?? 0;
    return base + getPersistentStatBonus(combatant, stat);
}

export function getPersistentStatBonus(combatant, stat) {
    return sumPersistentPassives(combatant, passive => {
        const isStatBonus = passive.effect === "STAT_BONUS" || Boolean(passive.stat);
        return isStatBonus && passive.stat === stat ? passive.amount ?? 0 : 0;
    });
}

export function getPersistentDamageAdd(combatant) {
    return sumPersistentPassives(combatant, passive => (
        passive.effect === "DAMAGE_ADD" ? passive.amount ?? 0 : 0
    ));
}

export function getPersistentDamageMultiplier(combatant) {
    return multiplyPersistentPassives(combatant, passive => (
        passive.effect === "DAMAGE_MULTIPLIER" ? passive.multiplier ?? 1 : 1
    ));
}

export function getActionCostMultiplier(combatant, definition) {
    if (definition?.type !== "spirit") return 1;

    return multiplyPersistentPassives(combatant, passive => (
        passive.effect === "ACTION_COST_MULTIPLIER" ? passive.multiplier ?? 1 : 1
    ));
}

export function getMovementPadCostMultiplier(combatant) {
    return multiplyPersistentPassives(combatant, passive => (
        passive.effect === "MOVEMENT_COST_MULTIPLIER" ? passive.multiplier ?? 1 : 1
    ));
}

export function getMovementStepPenalty(combatant) {
    return sumPersistentPassives(combatant, passive => (
        passive.effect === "MOVEMENT_STEP_PENALTY" ? passive.amount ?? 0 : 0
    ));
}

export function isMovementPrevented(combatant) {
    if ((combatant.movementLockedTurns ?? 0) > 0) return true;

    return sumPersistentPassives(combatant, passive => (
        passive.effect === "PREVENT_MOVEMENT" ? 1 : 0
    )) > 0;
}

export function getActionValue(actor, definition) {
    if (!definition || definition.hasActive === false) return 0;
    return Math.floor(definition.base + getEffectiveStat(actor, definition.stat) * definition.mult);
}

export function formatResourceCost(costs) {
    if (!Number.isFinite(costs.paf ?? 0) || !Number.isFinite(costs.pad ?? 0)) return "Opuesto";

    const parts = [];
    if ((costs.paf ?? 0) > 0) parts.push(`${costs.paf} PAF`);
    if ((costs.pad ?? 0) > 0) parts.push(`${costs.pad} PAD`);
    return parts.length > 0 ? parts.join(" + ") : "Gratis";
}

export function getAffinitySummary(combatant, definition) {
    if (definition.type !== "spirit") return "";

    const affinity = getSpiritAffinity(combatant, definition);
    const identity = IDENTITY_LABELS[definition.identity] ?? definition.identity;
    return `Identidad: ${identity} - ${affinity.label}`;
}

function getResourceMultiplier(combatant, definition) {
    if (definition.type !== "spirit") return 1;
    return getSpiritAffinity(combatant, definition).resourceMultiplier;
}

function getDurabilityMultiplier(combatant, definition) {
    if (definition.type !== "spirit") return 1;
    return getSpiritAffinity(combatant, definition).durabilityMultiplier;
}

function getScaledCost(costs, multiplier) {
    if (!Number.isFinite(multiplier)) {
        return {
            paf: (costs.paf ?? 0) > 0 ? Number.POSITIVE_INFINITY : 0,
            pad: (costs.pad ?? 0) > 0 ? Number.POSITIVE_INFINITY : 0
        };
    }

    return {
        paf: roundResourceAmount((costs.paf ?? 0) * multiplier),
        pad: roundResourceAmount((costs.pad ?? 0) * multiplier)
    };
}

function sumPersistentPassives(combatant, getValue) {
    return getPersistentPassives(combatant).reduce((total, passive) => total + getValue(passive), 0);
}

function multiplyPersistentPassives(combatant, getValue) {
    return getPersistentPassives(combatant).reduce((total, passive) => total * getValue(passive), 1);
}

function getPersistentPassives(combatant) {
    if (!combatant.inventory?.equipped) return [];

    return Object.values(combatant.inventory.equipped).flatMap(item => {
        const definition = item ? ITEMS_DB[item.itemId] : null;
        if (!definition || definition.type !== "spirit" || item.broken || getCurrentDurability(item) <= 0) return [];
        if (!getSpiritAffinity(combatant, definition).canEquip) return [];
        return definition.passives?.filter(passive => passive.type === "PERSISTENT") ?? [];
    });
}

function roundResourceAmount(value) {
    if (!Number.isFinite(value)) return value;
    return Math.round(value * 2) / 2;
}

function legacyCosts(cost) {
    if (cost === "BOTH") return { paf: 1, pad: 1 };
    if (cost === "PAD") return { paf: 0, pad: 1 };
    return { paf: 1, pad: 0 };
}
