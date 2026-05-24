import { IDENTITY_HEX } from "../data/combatIdentities.js";
import { ITEMS_DB } from "../data/items.js";
import { REST_COST } from "../config.js";
import {
    canUseItem,
    getEquippedActions,
    getItemDefinition,
    getItemDurabilityLabel,
    getPlayerActionResourceCost
} from "../systems/inventorySystem.js";
import { getItemTooltip } from "./itemTooltips.js";

export function renderActionBar(state, callbacks) {
    const bar = document.getElementById("action-bar");
    bar.innerHTML = "";

    bar.appendChild(createUtilityButton({
        className: "rest-btn",
        icon: "Z",
        label: "Descansar",
        tooltip: getRestTooltip(state),
        disabled: state.isInCombat || state.mode === "RESTING",
        onClick: callbacks.onRest
    }));

    bar.appendChild(createUtilityButton({
        className: "end-turn-btn",
        icon: ">>",
        label: getEndTurnLabel(state),
        tooltip: getEndTurnTooltip(state),
        disabled: state.mode === "RESTING",
        onClick: callbacks.onEndTurn
    }));

    getEquippedActions(state).forEach(action => {
        bar.appendChild(createActionButton(state, action, callbacks));
    });

    bar.appendChild(createUtilityButton({
        className: "inventory-toggle-btn",
        icon: "I",
        label: "Personaje",
        tooltip: "Personaje (I)",
        disabled: state.mode === "RESTING",
        onClick: callbacks.onToggleInventory
    }));
}

function getRestTooltip(state) {
    if (state.isInCombat) return "No puedes descansar en combate";
    return `Descansar (${REST_COST} monedas)`;
}

function getEndTurnLabel(state) {
    if (!state.isInCombat) return "Fin Turno";
    return state.combatPhase === "WALK" ? "Ejecutar movimiento" : "Ejecutar acciones";
}

function getEndTurnTooltip(state) {
    if (!state.isInCombat) return "Fin Turno (Esp)";
    return state.combatPhase === "WALK" ? "Ejecutar Fase Caminar (Esp)" : "Ejecutar Fase Accion (Esp)";
}

function createUtilityButton({ className, icon, label, tooltip, disabled = false, onClick }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `utility-btn ${className}`;
    button.dataset.tooltip = tooltip;
    button.setAttribute("aria-label", label);
    if (disabled) button.classList.add("disabled");
    button.innerHTML = `<span class="action-icon">${icon}</span>`;
    button.addEventListener("click", onClick);
    return button;
}

function createActionButton(state, action, callbacks) {
    const definition = getItemDefinition(action.item);
    const button = document.createElement("button");
    const usable = state.mode !== "RESTING" && canUseItem(state, action.item);

    button.type = "button";
    button.className = "action-btn";
    button.dataset.tooltip = getTooltip(state, action.item);
    button.setAttribute("aria-label", definition.name);
    applyIdentityStyle(button, definition);

    if (!usable) button.classList.add("disabled");
    if (state.activeAction?.item.uid === action.item.uid) button.classList.add("active");

    button.innerHTML = [
        `<span class="action-icon">${definition.icon}</span>`,
        `<div class="action-cost">${getCostIcon(getPlayerActionResourceCost(state, action.item))}</div>`,
        definition.type === "spirit" ? `<div class="action-uses">${getItemDurabilityLabel(action.item)}</div>` : ""
    ].join("");

    button.addEventListener("click", () => callbacks.onActionSelected(action, usable));
    button.addEventListener("mouseenter", () => callbacks.onActionPreview(action, usable));
    button.addEventListener("mouseleave", callbacks.onActionPreviewClear);
    return button;
}

function applyIdentityStyle(element, definition) {
    if (!definition.identity) return;

    element.dataset.identity = definition.identity.toLowerCase();
    element.style.setProperty("--identity-color", IDENTITY_HEX[definition.identity]);
    element.style.setProperty("--identity-text", getIdentityTextColor(definition.identity));
}

function getIdentityTextColor(identity) {
    return identity === "WHITE" || identity === "ORANGE" ? "#16181d" : "#ffffff";
}

function getCostIcon(cost) {
    if (!Number.isFinite(cost.paf ?? 0) || !Number.isFinite(cost.pad ?? 0)) return "OP";

    const parts = [];
    if ((cost.paf ?? 0) > 0) parts.push(`${cost.paf}F`);
    if ((cost.pad ?? 0) > 0) parts.push(`${cost.pad}D`);
    return parts.join("+");
}

function getTooltip(state, item) {
    const definition = ITEMS_DB[item.itemId];
    return getItemTooltip(state, item, definition);
}
