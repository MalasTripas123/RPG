import { IDENTITY_HEX } from "../data/combatIdentities.js";
import {
    getItemDefinition,
    getSlotItem,
    canPlaceItemInSlot,
    isItemLockedByQueuedSpirit,
    isSlotLockedByQueuedSpirit,
    isSpiritLockedByWalkPhase
} from "../systems/inventorySystem.js";
import { canEquipSpiritForCombatant } from "../systems/itemRules.js";
import { getItemTooltip } from "./itemTooltips.js";

export function renderInventory(state, callbacks) {
    let itemIndex = 0;

    Object.keys(state.player.inventory.equipped).forEach(slotId => {
        const slot = document.querySelector(`.slot[data-slot-id="${slotId}"]`);
        if (!slot) return;

        const item = getSlotItem(state, slotId);
        const isActionLocked = isSlotLockedByQueuedSpirit(state, slotId) || isItemLockedByQueuedSpirit(state, item);
        const isPhaseLocked = isSpiritLockedByWalkPhase(state, slotId, item);

        slot.innerHTML = "";
        slot.classList.toggle("action-locked", isActionLocked);
        slot.classList.toggle("phase-locked", isPhaseLocked);
        wireDropSlot(state, slot, callbacks);

        if (item) slot.appendChild(createItemElement(state, item, slotId, itemIndex++));
    });

    const bagGrid = document.getElementById("bag-grid");
    bagGrid.innerHTML = "";

    state.player.inventory.bag.forEach((item, index) => {
        const slotId = `bag-${index}`;
        const bagSlot = document.createElement("div");
        bagSlot.className = "bag-slot";
        bagSlot.dataset.slotId = slotId;

        if (isSlotLockedByQueuedSpirit(state, slotId) || isItemLockedByQueuedSpirit(state, item)) {
            bagSlot.classList.add("action-locked");
        }
        if (isSpiritLockedByWalkPhase(state, slotId, item)) {
            bagSlot.classList.add("phase-locked");
        }

        wireDropSlot(state, bagSlot, callbacks);

        if (item) bagSlot.appendChild(createItemElement(state, item, slotId, itemIndex++));
        bagGrid.appendChild(bagSlot);
    });
}

function createItemElement(state, item, slotId, itemIndex) {
    const definition = getItemDefinition(item);
    const isActionLocked = isItemLockedByQueuedSpirit(state, item);
    const isPhaseLocked = isSpiritLockedByWalkPhase(state, slotId, item);
    const element = document.createElement("div");
    element.className = "item";
    element.draggable = !item.broken && !isActionLocked && !isPhaseLocked;
    element.id = `inventory-item-${itemIndex}`;
    element.dataset.itemUid = item.uid;
    element.dataset.slotId = slotId;
    element.dataset.type = definition.type;
    applyIdentityStyle(element, definition);
    element.dataset.tooltip = getItemTooltip(state, item, definition, {
        actionLocked: isActionLocked,
        phaseLocked: isPhaseLocked,
        opposite: definition.type === "spirit" && !canEquipSpiritForCombatant(state.player, item)
    });

    if (item.broken) element.classList.add("broken");
    if (isActionLocked) element.classList.add("action-locked");
    if (isPhaseLocked) element.classList.add("phase-locked");

    element.innerHTML = `<span class="icon">${definition.icon}</span><span class="name">${definition.name}</span>`;
    element.addEventListener("mouseenter", event => showInventoryTooltip(element.dataset.tooltip, event));
    element.addEventListener("mousemove", event => moveInventoryTooltip(event));
    element.addEventListener("mouseleave", hideInventoryTooltip);
    element.addEventListener("dragstart", event => {
        if (item.broken || isActionLocked || isPhaseLocked) {
            event.preventDefault();
            return;
        }

        event.dataTransfer.setData("text/plain", slotId);
        hideInventoryTooltip();
        window.setTimeout(() => {
            element.style.opacity = "0.5";
        }, 0);
    });

    element.addEventListener("dragend", () => {
        element.style.opacity = "1";
        document.querySelectorAll(".slot, .bag-slot").forEach(slot => {
            slot.classList.remove("drag-over", "invalid-drop");
        });
    });

    return element;
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

function showInventoryTooltip(text, event) {
    const tooltip = getInventoryTooltipElement();
    tooltip.textContent = text;
    tooltip.classList.add("visible");
    moveInventoryTooltip(event);
}

function moveInventoryTooltip(event) {
    const tooltip = document.getElementById("inventory-floating-tooltip");
    if (!tooltip || !tooltip.classList.contains("visible")) return;

    const margin = 12;
    const offset = 16;
    const rect = tooltip.getBoundingClientRect();
    let left = event.clientX + offset;
    let top = event.clientY + offset;

    if (left + rect.width + margin > window.innerWidth) {
        left = event.clientX - rect.width - offset;
    }

    if (top + rect.height + margin > window.innerHeight) {
        top = window.innerHeight - rect.height - margin;
    }

    tooltip.style.left = `${Math.max(margin, left)}px`;
    tooltip.style.top = `${Math.max(margin, top)}px`;
}

export function hideInventoryTooltip() {
    const tooltip = document.getElementById("inventory-floating-tooltip");
    if (!tooltip) return;

    tooltip.classList.remove("visible");
}

function getInventoryTooltipElement() {
    let tooltip = document.getElementById("inventory-floating-tooltip");
    if (tooltip) return tooltip;

    tooltip = document.createElement("div");
    tooltip.id = "inventory-floating-tooltip";
    tooltip.className = "inventory-floating-tooltip";
    document.body.appendChild(tooltip);
    return tooltip;
}

function wireDropSlot(state, slot, callbacks) {
    if (slot.classList.contains("locked")) return;

    const targetSlotId = slot.dataset.slotId;
    const targetItem = getSlotItem(state, targetSlotId);
    if (isSlotLockedByQueuedSpirit(state, targetSlotId)) return;
    if (isItemLockedByQueuedSpirit(state, targetItem)) return;
    if (isSpiritLockedByWalkPhase(state, targetSlotId, targetItem)) return;

    slot.ondragover = event => {
        event.preventDefault();
        const sourceSlotId = event.dataTransfer.getData("text/plain");
        const sourceItem = getSlotItem(state, sourceSlotId);
        const currentTargetItem = getSlotItem(state, targetSlotId);
        const canDrop = (
            canDropItemInSlot(state, sourceItem, targetSlotId) &&
            !isItemLockedByQueuedSpirit(state, sourceItem) &&
            !isItemLockedByQueuedSpirit(state, currentTargetItem) &&
            !isSpiritLockedByWalkPhase(state, sourceSlotId, sourceItem) &&
            !isSpiritLockedByWalkPhase(state, targetSlotId, currentTargetItem)
        );
        slot.classList.add(canDrop ? "drag-over" : "invalid-drop");
    };

    slot.ondragleave = () => {
        slot.classList.remove("drag-over", "invalid-drop");
    };

    slot.ondrop = event => {
        event.preventDefault();
        slot.classList.remove("drag-over", "invalid-drop");

        const sourceSlotId = event.dataTransfer.getData("text/plain");
        callbacks.onMoveItem(sourceSlotId, targetSlotId);
    };
}

function canDropItemInSlot(state, item, slotId) {
    if (!canPlaceItemInSlot(item, slotId)) return false;
    if (!slotId.startsWith("equip-spirit")) return true;
    return canEquipSpiritForCombatant(state.player, item);
}
