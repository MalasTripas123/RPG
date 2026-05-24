import { getEffectiveStat } from "../systems/itemRules.js";
import { getEffectiveSpeed } from "../systems/turns.js";

export function updateHud(state) {
    const { player } = state;
    const { stats } = player;
    const effectiveSpeed = getEffectiveSpeed(player);

    setText("hud-level", stats.level);
    setText("hud-hp", player.currentHp);
    setText("hud-maxhp", stats.maxHp);
    setText("hud-paf", formatResource(player.paf));
    setText("hud-max-paf", formatResource(stats.maxPaf));
    setText("hud-pad", formatResource(player.pad));
    setText("hud-max-pad", formatResource(stats.maxPad));
    setText("hud-round", state.round);
    setText("stat-lvl", stats.level);
    setText("stat-xp", stats.xp);
    setText("stat-next-xp", stats.nextXp);
    setText("stat-hp", player.currentHp);
    setText("stat-maxhp", stats.maxHp);
    setText("stat-speed", effectiveSpeed);
    setText("stat-str", getEffectiveStat(player, "str"));
    setText("stat-dex", getEffectiveStat(player, "dex"));
    setText("stat-int", getEffectiveStat(player, "int"));
    setText("stat-vit", stats.vit);
    setText("stat-current-paf", formatResource(player.paf));
    setText("stat-current-pad", formatResource(player.pad));
    setText("stat-paf", formatResource(stats.maxPaf));
    setText("stat-pad", formatResource(stats.maxPad));
    setText("stat-movement", formatResource(stats.maxPad / 2));
    setText("stat-coins", player.coins);

    const xpBar = document.getElementById("xp-bar");
    if (xpBar) xpBar.style.width = `${Math.min(100, (stats.xp / stats.nextXp) * 100)}%`;

    const combatIndicator = document.getElementById("training-indicator");
    if (combatIndicator) {
        combatIndicator.innerText = state.isInCombat ? `⚔️ ${getCombatPhaseLabel(state.combatPhase)}` : "";
        combatIndicator.style.display = state.isInCombat ? "block" : "none";
    }

    const roundBox = document.getElementById("hud-round-box");
    if (roundBox) roundBox.style.display = state.isInCombat ? "block" : "none";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerText = value;
}

function formatResource(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getCombatPhaseLabel(phase) {
    if (phase === "WALK") return "FASE CAMINAR";
    if (phase === "ACTION") return "FASE ACCIÓN";
    return "EN COMBATE";
}
