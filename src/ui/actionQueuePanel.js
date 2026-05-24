import { IDENTITY_HEX } from "../data/combatIdentities.js";
import { ITEMS_DB } from "../data/items.js";

export function renderActionQueuePanel(state, callbacks) {
    const panel = document.getElementById("queued-actions-panel");
    if (!panel) return;

    const queue = state.player.actionQueue ?? [];
    const isVisible = state.isInCombat && state.combatPhase === "ACTION" && queue.length > 0;
    panel.classList.toggle("visible", isVisible);

    if (!isVisible) {
        panel.innerHTML = "";
        return;
    }

    panel.innerHTML = [
        `<div class="queued-actions-list">`,
        ...queue.map((action, index) => createQueuedActionHtml(action, index)),
        `</div>`
    ].join("");

    panel.querySelectorAll("[data-remove-action]").forEach(button => {
        button.addEventListener("click", () => callbacks.onRemoveAction(Number(button.dataset.removeAction)));
    });
}

function createQueuedActionHtml(action, index) {
    const skill = ITEMS_DB[action.itemId];
    const slotId = action.slotId ?? "";
    const itemUid = action.item?.uid ?? "";
    const identity = skill.identity?.toLowerCase() ?? "";
    const style = skill.identity
        ? ` style="--identity-color: ${IDENTITY_HEX[skill.identity]}; --identity-text: ${getIdentityTextColor(skill.identity)};"`
        : "";
    const identityAttribute = identity ? ` data-identity="${identity}"` : "";

    return [
        `<button class="queued-action-chip" type="button"${identityAttribute}${style} data-remove-action="${index}" data-action-slot-id="${slotId}" data-action-item-uid="${itemUid}" aria-label="Quitar ${skill.name}" title="Quitar ${skill.name}">`,
        `<span class="queued-action-icon">${skill.icon}</span>`,
        `<span class="queued-action-target">${action.target.x},${action.target.y}</span>`,
        `</button>`
    ].join("");
}

function getIdentityTextColor(identity) {
    return identity === "WHITE" || identity === "ORANGE" ? "#16181d" : "#ffffff";
}
