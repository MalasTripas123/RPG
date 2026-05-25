import { IDENTITY_LABELS } from "../data/combatIdentities.js";
import {
    formatResourceCost,
    getActionResourceCost,
    getActionValue,
    getCurrentDurability,
    getSpiritAffinity
} from "../systems/itemRules.js";

export function getItemTooltip(state, item, definition, options = {}) {
    if (definition.type !== "spirit") return definition.tooltip;

    return [
        getSpiritDescription(state, item, definition),
        item.broken ? "\nROTO" : ""
    ].filter(Boolean).join("\n");
}

export function getSpiritDescription(state, item, definition) {
    const affinity = getSpiritAffinity(state.player, definition);

    return [
        definition.name,
        `Identidad: ${IDENTITY_LABELS[definition.identity]} - ${affinity.label}`,
        `Coste de equipar: ${formatResourceCost(definition.equipCost ?? { paf: 0, pad: 1 })}`,
        `Durabilidad: ${getCurrentDurability(item)}/${definition.maxDurability}`,
        "Habilidades:",
        ...getPassiveLines(definition),
        ...getActiveLines(state, definition)
    ].join("\n");
}

function getPassiveLines(definition) {
    const passives = definition.passives ?? [];
    if (passives.length === 0) return [];
    return passives.map(passive => `- ${passive.description}`);
}

function getActiveLines(state, definition) {
    if (definition.hasActive === false) return [];

    const actionCost = getActionResourceCost(state.player, definition);

    return [
        `- Activa: ${formatResourceCost(actionCost)}`,
        `-- Alcance: ${getRangeLine(definition)}`,
        `-- Area de efecto: ${getAreaLine(definition)}`,
        `-- Objetivo: ${getTargetLabel(definition.targetMode)}`,
        `-- ${getEffectLine(state, definition)}`
    ];
}

function getRangeLine(definition) {
    if (definition.rangeType === "SELF") return "Propio";
    return `${definition.range} - ${getRangeLabel(definition.rangeType)}`;
}

function getAreaLine(definition) {
    const area = definition.area ?? { shape: "SINGLE", radius: 0 };
    if (area.shape === "SINGLE") return "0 - Un objetivo";
    if (area.shape === "CROSS") return `${area.radius} - Cruz`;
    if (area.shape === "DIAMOND") return `${area.radius} - Diamante`;
    return "0 - Un objetivo";
}

function getRangeLabel(rangeType) {
    if (rangeType === "LINEAR") return "Lineal";
    if (rangeType === "SELF") return "Propio";
    return "Radial";
}

function getTargetLabel(targetMode) {
    if (targetMode === "SELF") return "Propio";
    if (targetMode === "UNIT") return "Entidad";
    return "Casilla";
}

function getEffectLine(state, definition) {
    if (definition.effect === "RESTORE_RESOURCES") {
        return `Restaura: ${formatResourceCost(definition.restores ?? { paf: definition.base ?? 0, pad: 0 })}`;
    }

    if (definition.effect === "RESTORE_DURABILITY") {
        return `Durabilidad: +${definition.restoreDurabilityAmount ?? definition.base ?? 1}`;
    }

    const value = getActionValue(state.player, definition);
    return `${getEffectLabel(definition.effect)}: ${value} - (${getFormula(definition)})`;
}

function getEffectLabel(effect) {
    if (effect === "HEAL") return "Cura";
    if (effect === "BUFF_SPEED") return "Velocidad";
    if (effect === "BUFF_DAMAGE") return "Dano futuro";
    return "Dano";
}

function getFormula(definition) {
    return `${definition.base}+${getShortStatLabel(definition.stat)}*${definition.mult}`;
}

function getShortStatLabel(stat) {
    if (stat === "str") return "Fue";
    if (stat === "dex") return "Des";
    if (stat === "speed") return "Vel";
    if (stat === "vit") return "Vit";
    if (stat === "luck") return "Sue";
    return "Int";
}
