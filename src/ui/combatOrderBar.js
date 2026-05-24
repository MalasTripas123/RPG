import { getEntities } from "../systems/entitySystem.js";
import { getEffectiveSpeed } from "../systems/turns.js";

export function renderCombatOrderBar(state) {
    const bar = document.getElementById("combat-order-bar");
    if (!bar) return;

    bar.innerHTML = "";
    bar.classList.toggle("visible", state.isInCombat);
    if (!state.isInCombat) return;

    getOrderedCombatants(state).forEach(combatant => {
        bar.appendChild(createCombatantCard(state, combatant));
    });
}

function getOrderedCombatants(state) {
    return [state.player, ...getEntities(state)].sort((a, b) => {
        const speedDiff = getDisplaySpeed(b) - getDisplaySpeed(a);
        if (speedDiff !== 0) return speedDiff;
        if (a.type === "player") return -1;
        if (b.type === "player") return 1;
        return a.id.localeCompare(b.id);
    });
}

function createCombatantCard(state, combatant) {
    const card = document.createElement("div");
    const side = getCombatantSide(combatant);
    const health = getHealth(combatant);
    const queuedCount = combatant.actionQueue?.length ?? 0;

    card.className = `combat-card ${side}`;
    if (state.activeActionCombatantId === combatant.id) card.classList.add("active");

    card.innerHTML = [
        `<div class="combat-card-top">`,
        `<span class="combat-card-icon">${combatant.icon}</span>`,
        `<span class="combat-card-name">${combatant.name}</span>`,
        `<span class="combat-card-speed">VEL ${getDisplaySpeed(combatant)}</span>`,
        `</div>`,
        `<div class="combat-card-hp"><span style="width: ${health.percent}%"></span></div>`,
        `<div class="combat-card-bottom">`,
        `<span>${health.label}</span>`,
        queuedCount > 0 ? `<span>${queuedCount} en cola</span>` : `<span></span>`,
        `</div>`
    ].join("");

    return card;
}

function getCombatantSide(combatant) {
    if (combatant.type === "player") return "ally";
    if (combatant.type === "enemy") return "enemy";
    return "neutral";
}

function getHealth(combatant) {
    if (!combatant.stats?.maxHp) {
        return { percent: 100, label: "∞" };
    }

    const current = Math.max(0, combatant.currentHp);
    const max = combatant.stats.maxHp;
    return {
        percent: Math.max(0, Math.min(100, (current / max) * 100)),
        label: `${current}/${max}`
    };
}

function getDisplaySpeed(combatant) {
    if (!combatant.stats) return 0;
    return getEffectiveSpeed(combatant);
}
