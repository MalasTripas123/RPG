import { getPlannedMoveCost } from "../systems/movementSystem.js";

export function renderMovementPlanPanel(state, callbacks) {
    const panel = document.getElementById("movement-plan-panel");
    if (!panel) return;

    const path = state.player.plannedMove?.path ?? [];
    const isVisible = state.isInCombat && state.combatPhase === "WALK" && path.length > 0;
    panel.classList.toggle("visible", isVisible);

    if (!isVisible) {
        panel.innerHTML = "";
        return;
    }

    panel.innerHTML = [
        `<div class="movement-plan-copy">`,
        `<span>Ruta</span>`,
        `<strong>${path.length} casillas</strong>`,
        `<strong>${formatPad(getPlannedMoveCost(state))} PAD</strong>`,
        `</div>`,
        `<button id="btn-cancel-route" class="movement-cancel-btn" type="button" aria-label="Cancelar ruta" title="Cancelar ruta">×</button>`
    ].join("");

    document.getElementById("btn-cancel-route").addEventListener("click", callbacks.onCancelRoute);
}

function formatPad(value) {
    return Number.isInteger(value) ? String(value) : Number(value.toFixed(3)).toString();
}
