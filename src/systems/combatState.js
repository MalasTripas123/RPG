import { DUMMY_COMBAT_RANGE } from "../config.js";
import { getEntities } from "./entitySystem.js";

export function updateDummyCombatState(state) {
    const wasInCombat = state.isInCombat;
    state.isInCombat = getDistanceToDummy(state) <= DUMMY_COMBAT_RANGE;

    if (state.isInCombat && !wasInCombat) {
        state.combatPhase = "WALK";
        state.round = 1;
    } else if (!state.isInCombat) {
        state.combatPhase = "EXPLORATION";
    }

    return {
        changed: wasInCombat !== state.isInCombat,
        isInCombat: state.isInCombat
    };
}

export function getDistanceToDummy(state) {
    return Math.min(
        ...getEntities(state).map(entity => (
            Math.abs(state.player.gridX - entity.gridX) + Math.abs(state.player.gridY - entity.gridY)
        )),
        Number.POSITIVE_INFINITY
    );
}
