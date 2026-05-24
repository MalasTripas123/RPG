import { IDENTITY_HEX, IDENTITY_LABELS } from "../data/combatIdentities.js";
import { ITEMS_DB, WEAPON_IDS } from "../data/items.js";

export function renderStartMenu(callbacks) {
    const menu = document.getElementById("start-menu");
    const list = document.getElementById("start-weapon-list");
    if (!menu || !list) return;

    if (list.children.length === 0) {
        buildWeaponCards(list);
    }

    list.querySelectorAll(".start-weapon-card").forEach(button => {
        if (button.dataset.bound === "true") return;
        button.dataset.bound = "true";
        button.addEventListener("click", () => callbacks.onWeaponSelected(button.dataset.weaponId));
    });

    menu.classList.add("active");
}

export function hideStartMenu() {
    document.getElementById("start-menu")?.classList.remove("active");
}

function createWeaponCardHtml(weapon) {
    return [
        `<span class="start-weapon-icon">${weapon.icon}</span>`,
        `<span class="start-weapon-name">${weapon.name}</span>`,
        `<span class="start-weapon-identity">${IDENTITY_LABELS[weapon.identity]}</span>`,
        `<span class="start-weapon-meta">Alcance ${weapon.range}</span>`
    ].join("");
}

function buildWeaponCards(list) {
    WEAPON_IDS.forEach(weaponId => {
        const weapon = ITEMS_DB[weaponId];
        const button = document.createElement("button");
        button.type = "button";
        button.className = "start-weapon-card";
        button.dataset.weaponId = weaponId;
        button.dataset.identity = weapon.identity.toLowerCase();
        button.style.setProperty("--identity-color", IDENTITY_HEX[weapon.identity]);
        button.style.setProperty("--identity-text", getIdentityTextColor(weapon.identity));
        button.innerHTML = createWeaponCardHtml(weapon);
        list.appendChild(button);
    });
}

function getIdentityTextColor(identity) {
    return identity === "WHITE" || identity === "ORANGE" ? "#16181d" : "#ffffff";
}
