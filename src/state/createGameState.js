import { DUMMY_POSITION, TILE_SIZE } from "../config.js";
import {
    ITEMS_DB,
    PLAYER_BAG_SPIRIT_IDS,
    PLAYER_BAG_WEAPON_IDS,
    PLAYER_INITIAL_SPIRIT_IDS
} from "../data/items.js";
import { createMap } from "../data/world.js";

let itemSequence = 1;
let entitySequence = 1;

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
        stats: {
            level: 3,
            xp: 0,
            nextXp: 100,
            vit: 10,
            str: 14,
            int: 10,
            dex: 12,
            speed: 6,
            maxPaf: 3,
            maxPad: 6
        },
        coins: 0,
        equipped: createPlayerEquipment(weaponId, initialSpiritIds),
        bag: createPlayerBag(bagItemIds)
    });
}

function createPlayerEquipment(weaponId, initialSpiritIds) {
    const equipped = {
        "equip-weapon": createInventoryItem(weaponId)
    };

    for (let index = 0; index < 3; index++) {
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
    return createCombatant({
        id: `enemy-${entitySequence++}`,
        type: "enemy",
        x,
        y,
        color: "#c0392b",
        icon: "⚔️",
        name: "Soldado de prueba",
        stats: {
            level: 1,
            vit: 14,
            str: 8,
            int: 6,
            dex: 8,
            speed: 4,
            maxPaf: 1,
            maxPad: 4
        },
        equipped: {
            "equip-weapon": createInventoryItem("wep_hook")
        },
        bag: []
    });
}

function normalizeStats(stats) {
    return {
        ...stats,
        maxHp: stats.vit ? stats.vit * 5 : stats.maxHp
    };
}
