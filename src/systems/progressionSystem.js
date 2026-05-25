export const MVP_START_LEVEL = 3;
export const BASE_STAT_VALUE = 10;
export const STAT_POINTS_PER_LEVEL = 6;
export const MAX_SPIRIT_SLOTS = 6;

export const STAT_KEYS = Object.freeze(["str", "int", "vit", "speed", "dex", "luck"]);

export const STAT_LABELS = Object.freeze({
    str: "Fuerza",
    int: "Inteligencia",
    vit: "Vitalidad",
    speed: "Velocidad",
    dex: "Destreza",
    luck: "Suerte"
});

const XP_PER_ENEMY_LEVEL = 11;

export function createStatsForLevel(level = 1, overrides = {}) {
    const stats = {
        level,
        xp: 0,
        str: BASE_STAT_VALUE,
        int: BASE_STAT_VALUE,
        vit: BASE_STAT_VALUE,
        speed: BASE_STAT_VALUE,
        dex: BASE_STAT_VALUE,
        luck: BASE_STAT_VALUE,
        ...overrides
    };

    if (stats.statPoints == null) {
        stats.statPoints = Math.max(0, getTotalStatPointsForLevel(stats.level) - getSpentStatPoints(stats));
    }

    return recalculateDerivedStats(stats);
}

export function recalculateDerivedStats(stats) {
    stats.level = Math.max(1, Math.floor(stats.level ?? 1));
    stats.xp = Math.max(0, Math.floor(stats.xp ?? 0));
    stats.statPoints = Math.max(0, Math.floor(stats.statPoints ?? 0));

    STAT_KEYS.forEach(stat => {
        stats[stat] = Math.max(1, Math.floor(stats[stat] ?? BASE_STAT_VALUE));
    });

    stats.nextXp = getNextLevelXp(stats.level);
    stats.maxPaf = getMaxPaf(stats);
    stats.maxPad = getMaxPad(stats);
    stats.maxSpiritSlots = getUnlockedSpiritSlotCount(stats.level);
    stats.maxHp = getMaxHp(stats);
    stats.critChance = getCriticalChanceFromLuck(stats.luck);
    return stats;
}

export function refreshCombatantDerivedStats(combatant, options = {}) {
    const previousMaxHp = combatant.stats?.maxHp ?? 0;
    const previousMaxPaf = combatant.stats?.maxPaf ?? 0;
    const previousMaxPad = combatant.stats?.maxPad ?? 0;
    recalculateDerivedStats(combatant.stats);

    const hpDelta = combatant.stats.maxHp - previousMaxHp;
    const pafDelta = combatant.stats.maxPaf - previousMaxPaf;
    const padDelta = combatant.stats.maxPad - previousMaxPad;
    if (options.keepHealthRatio) {
        const ratio = previousMaxHp > 0 ? combatant.currentHp / previousMaxHp : 1;
        combatant.currentHp = Math.ceil(combatant.stats.maxHp * ratio);
    } else if (options.addMaxHpDelta && hpDelta > 0) {
        combatant.currentHp += hpDelta;
    }

    if (options.addMaxResourceDelta) {
        if (pafDelta > 0) combatant.paf += pafDelta;
        if (padDelta > 0) combatant.pad += padDelta;
    }

    combatant.currentHp = Math.max(0, Math.min(combatant.currentHp, combatant.stats.maxHp));
    combatant.paf = Math.min(combatant.paf ?? combatant.stats.maxPaf, combatant.stats.maxPaf);
    combatant.pad = Math.min(combatant.pad ?? combatant.stats.maxPad, combatant.stats.maxPad);
}

export function increaseCombatantStat(combatant, stat) {
    if (!STAT_KEYS.includes(stat)) return { ok: false, reason: "UNKNOWN_STAT" };
    if ((combatant.stats.statPoints ?? 0) <= 0) return { ok: false, reason: "NO_POINTS" };

    combatant.stats[stat]++;
    combatant.stats.statPoints--;
    refreshCombatantDerivedStats(combatant, {
        addMaxHpDelta: stat === "vit",
        addMaxResourceDelta: stat === "str" || stat === "int"
    });

    return {
        ok: true,
        stat,
        label: STAT_LABELS[stat],
        value: combatant.stats[stat],
        remaining: combatant.stats.statPoints
    };
}

export function grantExperience(combatant, amount) {
    const stats = combatant.stats;
    stats.xp += Math.max(0, Math.floor(amount));

    let levelsGained = 0;
    while (stats.xp >= getNextLevelXp(stats.level)) {
        stats.xp -= getNextLevelXp(stats.level);
        stats.level++;
        stats.statPoints = (stats.statPoints ?? 0) + STAT_POINTS_PER_LEVEL;
        levelsGained++;
    }

    refreshCombatantDerivedStats(combatant, {
        addMaxHpDelta: levelsGained > 0
    });

    if (levelsGained > 0) {
        combatant.currentHp = combatant.stats.maxHp;
        combatant.paf = combatant.stats.maxPaf;
        combatant.pad = combatant.stats.maxPad;
    }

    return {
        amount,
        levelsGained,
        level: stats.level,
        xp: stats.xp,
        nextXp: stats.nextXp
    };
}

export function getEnemyXpReward(enemy) {
    return Math.max(1, (enemy.stats?.level ?? 1) * XP_PER_ENEMY_LEVEL);
}

export function getCriticalChanceFromLuck(luck) {
    return Math.max(0, Math.min(100, Math.floor(luck ?? 0)));
}

export function getUnlockedSpiritSlotCount(level) {
    return Math.min(MAX_SPIRIT_SLOTS, Math.max(1, Math.floor(level ?? 1)));
}

export function isSpiritSlotUnlocked(stats, slotId) {
    const slotNumber = getSpiritSlotNumber(slotId);
    if (!slotNumber) return true;
    return slotNumber <= getUnlockedSpiritSlotCount(stats.level);
}

export function getSpiritSlotNumber(slotId) {
    const match = /^equip-spirit-(\d+)$/.exec(slotId ?? "");
    return match ? Number(match[1]) : null;
}

function getMaxHp(stats) {
    return stats.vit * (stats.level * 5);
}

function getMaxPaf(stats) {
    return Math.max(1, stats.level + Math.floor(stats.str / 10));
}

function getMaxPad(stats) {
    return Math.max(2, stats.level * 2 + Math.floor(stats.int / 5));
}

function getNextLevelXp(level) {
    return Math.max(1, 45 * Math.floor(level) * Math.floor(level));
}

function getTotalStatPointsForLevel(level) {
    return Math.max(1, Math.floor(level)) * STAT_POINTS_PER_LEVEL;
}

function getSpentStatPoints(stats) {
    return STAT_KEYS.reduce((total, stat) => (
        total + Math.max(0, (stats[stat] ?? BASE_STAT_VALUE) - BASE_STAT_VALUE)
    ), 0);
}
