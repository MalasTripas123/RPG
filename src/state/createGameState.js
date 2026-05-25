import { DUMMY_POSITION, TILE_SIZE } from "../config.js";
import {
    ITEMS_DB,
    PLAYER_BAG_SPIRIT_IDS,
    PLAYER_BAG_WEAPON_IDS,
    PLAYER_INITIAL_SPIRIT_IDS
} from "../data/items.js";
import { createMap } from "../data/world.js";
import {
    MAX_SPIRIT_SLOTS,
    MVP_START_LEVEL,
    createStatsForLevel
} from "../systems/progressionSystem.js";

let itemSequence = 1;
let entitySequence = 1;
let enemyLevelSequence = 0;

export function createInventoryItem(itemId) {
    const definition = ITEMS_DB[itemId];
    const item = {
        uid: `item-${itemSequence++}`,
        itemId
    };

    if (definition.type === "spirit") {
        item.durability = definition.maxDurability;
        item.broken = false;
        item.persistentDurabilityRound = null;
    }

    return item;
}

export function createGameState(loadout = {}) {
    const playerX = 20;
    const playerY = 45;
    enemyLevelSequence = 0;

    return {
        mode: "IDLE",
        camera: { x: 0, y: 0, lockedToPlayer: true },
        settings: {
            invertCameraDrag: false
        },
        map: createMap(),
        hoverTile: null,
        floatingTexts: [],
        validTargetTiles: [],
        previewTargetTiles: [],
        activeAction: null,
        actionPlayback: {
            fast: false,
            normalDelayMs: 1000,
            fastDelayMs: 180
        },
        isInCombat: false,
        combatPhase: "EXPLORATION",
        activeActionCombatantId: null,
        round: 1,
        player: createPlayer(playerX, playerY, loadout),
        dummies: [createDummy(DUMMY_POSITION.x, DUMMY_POSITION.y)],
        enemies: []
    };
}

function createPlayer(x, y, loadout = {}) {
    const weaponId = loadout?.weaponId ?? "wep_musket";
    const initialSpiritIds = loadout?.initialSpiritIds ?? PLAYER_INITIAL_SPIRIT_IDS;
    const bagItemIds = loadout?.bagItemIds ?? [
        ...PLAYER_BAG_WEAPON_IDS,
        ...PLAYER_BAG_SPIRIT_IDS
    ];

    return createCombatant({
        id: "player",
        type: "player",
        x,
        y,
        color: "#3498db",
        icon: "🧙",
        name: "Héroe",
        stats: createStatsForLevel(MVP_START_LEVEL),
        coins: 0,
        equipped: createPlayerEquipment(weaponId, initialSpiritIds),
        bag: createPlayerBag(bagItemIds)
    });
}

function createPlayerEquipment(weaponId, initialSpiritIds) {
    const equipped = {
        "equip-weapon": createInventoryItem(weaponId)
    };

    for (let index = 0; index < MAX_SPIRIT_SLOTS; index++) {
        const spiritId = initialSpiritIds[index];
        equipped[`equip-spirit-${index + 1}`] = spiritId ? createInventoryItem(spiritId) : null;
    }

    return equipped;
}

function createCombatant({ id, type, x, y, color, icon, name, stats, coins = 0, equipped, bag }) {
    const finalStats = normalizeStats(stats);

    return {
        id,
        type,
        gridX: x,
        gridY: y,
        pixelX: x * TILE_SIZE,
        pixelY: y * TILE_SIZE,
        color,
        icon,
        name,
        path: [],
        plannedMove: null,
        actionQueue: [],
        stats: finalStats,
        currentHp: finalStats.maxHp,
        coins,
        speedBonus: 0,
        damageAddBonus: 0,
        damageMultiplierBonus: 1,
        movementLockedTurns: 0,
        paf: finalStats.maxPaf,
        pad: finalStats.maxPad,
        inventory: {
            equipped,
            bag
        }
    };
}

function createPlayerBag(itemIds) {
    const items = itemIds.map(createInventoryItem);

    while (items.length < 44) items.push(null);
    return items;
}

export function createDummy(x, y) {
    return {
        id: `dummy-${entitySequence++}`,
        type: "dummy",
        gridX: x,
        gridY: y,
        pixelX: x * TILE_SIZE,
        pixelY: y * TILE_SIZE,
        icon: "🎯",
        name: "Maniquí",
        hpLabel: "∞"
    };
}

export function createEnemy(x, y) {
    const level = getNextEnemyLevel();

    return createCombatant({
        id: `enemy-${entitySequence++}`,
        type: "enemy",
        x,
        y,
        color: "#c0392b",
        icon: "⚔️",
        name: `Soldado Nv.${level}`,
        stats: createStatsForLevel(level, { statPoints: 0 }),
        equipped: {
            "equip-weapon": createInventoryItem("wep_hook")
        },
        bag: []
    });
}

function normalizeStats(stats) {
    return createStatsForLevel(stats.level ?? 1, stats);
}

function getNextEnemyLevel() {
    const level = (enemyLevelSequence % 5) + 1;
    enemyLevelSequence++;
    return level;
}
