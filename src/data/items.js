import { IDENTITY_LABELS } from "./combatIdentities.js";

function weapon({ id, name, identity, icon, range, rangeType = "RADIAL", base, stat, mult }) {
    const statLabel = getShortStatLabel(stat);
    return {
        id,
        type: "weapon",
        name,
        activeName: `Ataque basico: ${name}`,
        identity,
        icon,
        effect: "DAMAGE",
        targetMode: "UNIT",
        rangeType,
        range,
        area: { shape: "SINGLE", radius: 0 },
        costs: { paf: 1, pad: 0 },
        base,
        stat,
        mult,
        tooltip: [
            name,
            `Tipo: ${getWeaponRangeLabel(range)}`,
            `Identidad: ${IDENTITY_LABELS[identity]}`,
            `Ataque basico: ${base}+${statLabel}*${mult}`,
            `Alcance: ${range}`
        ].join("\n")
    };
}

function spirit(config) {
    return {
        type: "spirit",
        hasActive: config.hasActive !== false,
        area: { shape: "SINGLE", radius: 0 },
        equipCost: { paf: 0, pad: 1 },
        durabilityCost: 1,
        ...config,
        activeName: config.activeName ?? config.name,
        passives: config.passives ?? []
    };
}

const WEAPONS = Object.freeze({
    wep_hook: weapon({
        id: "wep_hook",
        name: "Garfio",
        identity: "WHITE",
        icon: "GF",
        range: 1,
        base: 15,
        stat: "str",
        mult: 1.5
    }),
    wep_knife: weapon({
        id: "wep_knife",
        name: "Cuchillo",
        identity: "BLACK",
        icon: "CU",
        range: 1,
        base: 15,
        stat: "str",
        mult: 2
    }),
    wep_club: weapon({
        id: "wep_club",
        name: "Garrote",
        identity: "RED",
        icon: "GA",
        range: 3,
        base: 20,
        stat: "str",
        mult: 3
    }),
    wep_whip: weapon({
        id: "wep_whip",
        name: "Latigo",
        identity: "BLUE",
        icon: "LA",
        range: 4,
        base: 20,
        stat: "str",
        mult: 2.5
    }),
    wep_musket: weapon({
        id: "wep_musket",
        name: "Mosquete",
        identity: "ORANGE",
        icon: "MO",
        range: 8,
        rangeType: "LINEAR",
        base: 5,
        stat: "dex",
        mult: 3
    }),
    wep_crossbow: weapon({
        id: "wep_crossbow",
        name: "Ballesta",
        identity: "GREEN",
        icon: "BA",
        range: 7,
        rangeType: "LINEAR",
        base: 5,
        stat: "dex",
        mult: 4
    })
});

const SPIRITS = Object.freeze({
    spi_black_mark: spirit({
        id: "spi_black_mark",
        name: "Marca de Tinta",
        identity: "BLACK",
        icon: "N1",
        maxDurability: 5,
        costs: { paf: 1, pad: 0 },
        rangeType: "RADIAL",
        range: 3,
        targetMode: "UNIT",
        effect: "DAMAGE",
        base: 8,
        stat: "dex",
        mult: 1.4,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_HIT",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 0, pad: 1 },
                durabilityCost: 0,
                description: "Al impactar la habilidad activa, restaura 1 PAD."
            }
        ]
    }),
    spi_black_echo: spirit({
        id: "spi_black_echo",
        name: "Eco de Tinta",
        identity: "BLACK",
        icon: "N2",
        maxDurability: 6,
        hasActive: false,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ANY_SPIRIT_DAMAGE",
                effect: "ECHO_ACTIVE",
                restoreSourceDurability: 1,
                durabilityCost: 1,
                description: "Cuando la habilidad activa de cualquier espiritu haga dano, restaura 1 punto de durabilidad y autolanza esa habilidad hacia el mismo objetivo sin pagar PAF. El lanzamiento consume durabilidad y PAD si aplica."
            }
        ]
    }),
    spi_black_price: spirit({
        id: "spi_black_price",
        name: "Precio del Abismo",
        identity: "BLACK",
        icon: "N3",
        maxDurability: 8,
        hasActive: false,
        passives: [
            {
                type: "PERSISTENT",
                effect: "ACTION_COST_MULTIPLIER",
                multiplier: 2,
                durabilityCost: 1,
                description: "Mientras este equipado, tus habilidades cuestan el doble de PA-D/F."
            },
            {
                type: "PERSISTENT",
                effect: "DAMAGE_MULTIPLIER",
                multiplier: 1.8,
                durabilityCost: 0,
                description: "Mientras este equipado, tus habilidades hacen x1.8 dano."
            }
        ]
    }),
    spi_black_cut: spirit({
        id: "spi_black_cut",
        name: "Corte Nulo",
        identity: "BLACK",
        icon: "N4",
        maxDurability: 4,
        costs: { paf: 1, pad: 1 },
        rangeType: "RADIAL",
        range: 2,
        targetMode: "UNIT",
        effect: "DAMAGE",
        base: 12,
        stat: "str",
        mult: 1.1,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_HIT",
                effect: "RESTORE_SELF_DURABILITY",
                amount: 1,
                durabilityCost: 0,
                description: "Al impactar, restaura 1 durabilidad de este espiritu."
            }
        ]
    }),
    spi_black_anchor: spirit({
        id: "spi_black_anchor",
        name: "Ancla Umbral",
        identity: "BLACK",
        icon: "N5",
        maxDurability: 5,
        costs: { paf: 1, pad: 0 },
        rangeType: "RADIAL",
        range: 4,
        targetMode: "TILE",
        effect: "DAMAGE",
        base: 6,
        stat: "int",
        mult: 1.2,
        area: { shape: "DIAMOND", radius: 1 },
        status: { preventMovementTurns: 1 },
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_HIT",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 0, pad: 1 },
                durabilityCost: 0,
                description: "Al impactar, restaura 1 PAD."
            }
        ]
    }),

    spi_red_cross: spirit({
        id: "spi_red_cross",
        name: "Cruz de Brasa",
        identity: "RED",
        icon: "R1",
        maxDurability: 5,
        costs: { paf: 1, pad: 0 },
        rangeType: "RADIAL",
        range: 3,
        targetMode: "TILE",
        effect: "DAMAGE",
        base: 10,
        stat: "int",
        mult: 1.3,
        area: { shape: "CROSS", radius: 1 },
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_EXECUTE",
                effect: "SPEND_RESOURCE_FOR_BONUS_DAMAGE",
                resourceCost: { paf: 0, pad: 1 },
                amount: 4,
                durabilityCost: 0,
                description: "Al ejecutarse la habilidad activa, consume un PAD. Si se consumio PAD de esta forma la habilidad activa hace 4 de dano extra."
            }
        ]
    }),
    spi_red_forge: spirit({
        id: "spi_red_forge",
        name: "Forja Rabiosa",
        identity: "RED",
        icon: "R2",
        maxDurability: 8,
        hasActive: false,
        passives: [
            {
                type: "PERSISTENT",
                effect: "DAMAGE_ADD",
                amount: 5,
                durabilityCost: 1,
                description: "Mientras este equipado, tus habilidades hacen 5 de dano extra."
            },
            {
                type: "PERSISTENT",
                effect: "MOVEMENT_COST_MULTIPLIER",
                multiplier: 2,
                durabilityCost: 0,
                description: "Mientras este equipado, tu movimiento cuesta el doble de PAD."
            }
        ]
    }),
    spi_red_roar: spirit({
        id: "spi_red_roar",
        name: "Rugido de Horno",
        identity: "RED",
        icon: "R3",
        maxDurability: 4,
        costs: { paf: 1, pad: 0 },
        rangeType: "SELF",
        range: 0,
        targetMode: "SELF",
        effect: "BUFF_DAMAGE",
        base: 6,
        stat: "str",
        mult: 0,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_EXECUTE",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 0, pad: 1 },
                durabilityCost: 0,
                description: "Al ejecutarse, restaura 1 PAD."
            }
        ]
    }),
    spi_red_blood: spirit({
        id: "spi_red_blood",
        name: "Sangre en Llamas",
        identity: "RED",
        icon: "R4",
        maxDurability: 5,
        costs: { paf: 1, pad: 1 },
        rangeType: "RADIAL",
        range: 2,
        targetMode: "UNIT",
        effect: "DAMAGE",
        base: 18,
        stat: "str",
        mult: 1.2,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_HIT",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 1, pad: 0 },
                durabilityCost: 1,
                description: "Al impactar, consume 1 durabilidad adicional y restaura 1 PAF."
            }
        ]
    }),
    spi_red_final: spirit({
        id: "spi_red_final",
        name: "Incendio Final",
        identity: "RED",
        icon: "R5",
        maxDurability: 3,
        costs: { paf: 2, pad: 2 },
        durabilityCost: 2,
        rangeType: "RADIAL",
        range: 4,
        targetMode: "TILE",
        effect: "DAMAGE",
        base: 24,
        stat: "int",
        mult: 2,
        area: { shape: "DIAMOND", radius: 1 },
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_BREAK",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 1, pad: 2 },
                durabilityCost: 0,
                description: "Al romperse, restaura 1 PAF y 2 PAD."
            }
        ]
    }),

    spi_orange_shot: spirit({
        id: "spi_orange_shot",
        name: "Tiro Ambar",
        identity: "ORANGE",
        icon: "O1",
        maxDurability: 5,
        costs: { paf: 0, pad: 2 },
        rangeType: "LINEAR",
        range: 6,
        targetMode: "UNIT",
        effect: "DAMAGE",
        base: 6,
        stat: "dex",
        mult: 2,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_EQUIP_COMBAT",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 0, pad: 1 },
                durabilityCost: 1,
                description: "Al equiparse en combate, restaura 1 PAD."
            }
        ]
    }),
    spi_orange_reload: spirit({
        id: "spi_orange_reload",
        name: "Recarga Viva",
        identity: "ORANGE",
        icon: "O2",
        maxDurability: 6,
        hasActive: false,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ANY_SPIRIT_DAMAGE",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 1, pad: 0 },
                durabilityCost: 1,
                description: "Cuando una habilidad activa de espiritu haga dano, restaura 1 PAF."
            },
            {
                type: "TRIGGERED",
                trigger: "ON_BREAK",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 0, pad: 3 },
                durabilityCost: 0,
                description: "Al romperse, restaura 3 PAD."
            }
        ]
    }),
    spi_orange_focus: spirit({
        id: "spi_orange_focus",
        name: "Pulso Preciso",
        identity: "ORANGE",
        icon: "O3",
        maxDurability: 8,
        hasActive: false,
        passives: [
            {
                type: "PERSISTENT",
                effect: "STAT_BONUS",
                stat: "dex",
                amount: 2,
                durabilityCost: 1,
                description: "Mientras este equipado, gana 2 Destreza."
            },
            {
                type: "PERSISTENT",
                effect: "STAT_BONUS",
                stat: "speed",
                amount: 1,
                durabilityCost: 0,
                description: "Mientras este equipado, gana 1 Velocidad."
            }
        ]
    }),
    spi_orange_lightstep: spirit({
        id: "spi_orange_lightstep",
        name: "Polvora Ligera",
        identity: "ORANGE",
        icon: "O4",
        maxDurability: 7,
        hasActive: false,
        passives: [
            {
                type: "PERSISTENT",
                effect: "MOVEMENT_COST_MULTIPLIER",
                multiplier: 0.5,
                durabilityCost: 1,
                description: "Mientras este equipado, moverse cuesta la mitad de PAD."
            },
            {
                type: "TRIGGERED",
                trigger: "ON_ROUND_START",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 0, pad: 1 },
                durabilityCost: 0,
                description: "Al iniciar un turno de combate, restaura 1 PAD."
            }
        ]
    }),
    spi_orange_last: spirit({
        id: "spi_orange_last",
        name: "Ultimo Cartucho",
        identity: "ORANGE",
        icon: "O5",
        maxDurability: 4,
        costs: { paf: 1, pad: 2 },
        rangeType: "LINEAR",
        range: 8,
        targetMode: "UNIT",
        effect: "DAMAGE",
        base: 20,
        stat: "dex",
        mult: 2.2,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_EXECUTE",
                effect: "LOW_DURABILITY_BONUS_DAMAGE",
                amount: 10,
                threshold: 1,
                durabilityCost: 0,
                description: "Si se ejecuta con 1 durabilidad o menos, hace 10 de dano extra."
            }
        ]
    }),

    spi_white_breath: spirit({
        id: "spi_white_breath",
        name: "Aliento Blanco",
        identity: "WHITE",
        icon: "W1",
        maxDurability: 5,
        costs: { paf: 1, pad: 0 },
        rangeType: "RADIAL",
        range: 4,
        targetMode: "UNIT",
        effect: "HEAL",
        base: 12,
        stat: "int",
        mult: 1.4,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_UNEQUIP_COMBAT",
                effect: "HEAL_SELF",
                amount: 5,
                durabilityCost: 1,
                description: "Al desequiparse en combate, te cura 5."
            }
        ]
    }),
    spi_white_mirror: spirit({
        id: "spi_white_mirror",
        name: "Espejo Claro",
        identity: "WHITE",
        icon: "W2",
        maxDurability: 7,
        hasActive: false,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ANY_HEAL",
                effect: "RESTORE_SOURCE_DURABILITY",
                amount: 1,
                durabilityCost: 1,
                description: "Cuando una habilidad activa cure, restaura 1 durabilidad al espiritu que curo."
            },
            {
                type: "TRIGGERED",
                trigger: "ON_ANY_RESOURCE_RESTORE",
                effect: "HEAL_SELF",
                amount: 3,
                durabilityCost: 0,
                description: "Cuando una habilidad restaure PA-D/F, te cura 3."
            }
        ]
    }),
    spi_white_guard: spirit({
        id: "spi_white_guard",
        name: "Guardia Alba",
        identity: "WHITE",
        icon: "W3",
        maxDurability: 4,
        costs: { paf: 0, pad: 2 },
        rangeType: "SELF",
        range: 0,
        targetMode: "SELF",
        effect: "RESTORE_RESOURCES",
        base: 1,
        stat: "int",
        mult: 0,
        restores: { paf: 1, pad: 2 },
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_EXECUTE",
                effect: "HEAL_SELF",
                amount: 4,
                durabilityCost: 0,
                description: "Al ejecutarse, te cura 4."
            }
        ]
    }),
    spi_white_oath: spirit({
        id: "spi_white_oath",
        name: "Juramento Blanco",
        identity: "WHITE",
        icon: "W4",
        maxDurability: 9,
        hasActive: false,
        passives: [
            {
                type: "PERSISTENT",
                effect: "STAT_BONUS",
                stat: "str",
                amount: 1,
                durabilityCost: 1,
                description: "Mientras este equipado, gana 1 Fuerza."
            },
            {
                type: "PERSISTENT",
                effect: "STAT_BONUS",
                stat: "dex",
                amount: 1,
                durabilityCost: 0,
                description: "Mientras este equipado, gana 1 Destreza."
            },
            {
                type: "TRIGGERED",
                trigger: "ON_ROUND_START",
                effect: "HEAL_SELF",
                amount: 3,
                durabilityCost: 0,
                description: "Al iniciar un turno de combate, te cura 3."
            }
        ]
    }),
    spi_white_final: spirit({
        id: "spi_white_final",
        name: "Amanecer Total",
        identity: "WHITE",
        icon: "W5",
        maxDurability: 3,
        costs: { paf: 2, pad: 1 },
        durabilityCost: 2,
        rangeType: "SELF",
        range: 0,
        targetMode: "SELF",
        effect: "HEAL",
        base: 24,
        stat: "int",
        mult: 2,
        area: { shape: "DIAMOND", radius: 2 },
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_EXECUTE",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 0, pad: 2 },
                durabilityCost: 0,
                description: "Al ejecutarse, restaura 2 PAD."
            }
        ]
    }),

    spi_green_root: spirit({
        id: "spi_green_root",
        name: "Raiz Verde",
        identity: "GREEN",
        icon: "G1",
        maxDurability: 5,
        costs: { paf: 0, pad: 2 },
        rangeType: "SELF",
        range: 0,
        targetMode: "SELF",
        effect: "HEAL",
        base: 8,
        stat: "int",
        mult: 1,
        area: { shape: "DIAMOND", radius: 1 },
        passives: [
            {
                type: "PERSISTENT",
                effect: "STAT_BONUS",
                stat: "str",
                amount: 1,
                durabilityCost: 1,
                description: "Mientras este equipado, gana 1 Fuerza."
            }
        ]
    }),
    spi_green_growth: spirit({
        id: "spi_green_growth",
        name: "Crecimiento Salvaje",
        identity: "GREEN",
        icon: "G2",
        maxDurability: 8,
        hasActive: false,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ROUND_START",
                effect: "RESTORE_EQUIPPED_DURABILITY",
                amount: 1,
                durabilityCost: 1,
                description: "Al iniciar un turno de combate, restaura 1 durabilidad a tus otros espiritus equipados."
            },
            {
                type: "TRIGGERED",
                trigger: "ON_ANY_HEAL",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 0, pad: 1 },
                durabilityCost: 0,
                description: "Cuando una habilidad activa cure, restaura 1 PAD."
            }
        ]
    }),
    spi_green_thorns: spirit({
        id: "spi_green_thorns",
        name: "Espinas Vivas",
        identity: "GREEN",
        icon: "G3",
        maxDurability: 8,
        hasActive: false,
        passives: [
            {
                type: "PERSISTENT",
                effect: "DAMAGE_ADD",
                amount: 2,
                durabilityCost: 1,
                description: "Mientras este equipado, tus habilidades hacen 2 de dano extra."
            },
            {
                type: "PERSISTENT",
                effect: "MOVEMENT_STEP_PENALTY",
                amount: 1,
                durabilityCost: 0,
                description: "Mientras este equipado, tu movimiento maximo baja en 1 casilla."
            }
        ]
    }),
    spi_green_pact: spirit({
        id: "spi_green_pact",
        name: "Pacto de Savia",
        identity: "GREEN",
        icon: "G4",
        maxDurability: 5,
        costs: { paf: 0, pad: 2 },
        rangeType: "SELF",
        range: 0,
        targetMode: "SELF",
        effect: "RESTORE_DURABILITY",
        base: 2,
        stat: "int",
        mult: 0,
        restoreDurabilityAmount: 2,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_EXECUTE",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 0, pad: 1 },
                durabilityCost: 0,
                description: "Al ejecutarse, restaura 1 PAD."
            }
        ]
    }),
    spi_green_final: spirit({
        id: "spi_green_final",
        name: "Bosque Infinito",
        identity: "GREEN",
        icon: "G5",
        maxDurability: 3,
        costs: { paf: 2, pad: 0 },
        durabilityCost: 2,
        rangeType: "RADIAL",
        range: 3,
        targetMode: "TILE",
        effect: "HEAL",
        base: 18,
        stat: "int",
        mult: 1.8,
        area: { shape: "DIAMOND", radius: 1 },
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_EXECUTE",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 1, pad: 1 },
                durabilityCost: 0,
                description: "Al ejecutarse, restaura 1 PAF y 1 PAD."
            }
        ]
    }),

    spi_blue_tide: spirit({
        id: "spi_blue_tide",
        name: "Marea Azul",
        identity: "BLUE",
        icon: "B1",
        maxDurability: 5,
        costs: { paf: 1, pad: 1 },
        rangeType: "LINEAR",
        range: 4,
        targetMode: "TILE",
        effect: "DAMAGE",
        base: 9,
        stat: "int",
        mult: 1.5,
        area: { shape: "CROSS", radius: 2 },
        passives: [
            {
                type: "PERSISTENT",
                effect: "STAT_BONUS",
                stat: "speed",
                amount: 1,
                durabilityCost: 1,
                description: "Mientras este equipado, gana 1 Velocidad."
            }
        ]
    }),
    spi_blue_lock: spirit({
        id: "spi_blue_lock",
        name: "Grillete Azul",
        identity: "BLUE",
        icon: "B2",
        maxDurability: 5,
        costs: { paf: 1, pad: 0 },
        rangeType: "RADIAL",
        range: 4,
        targetMode: "UNIT",
        effect: "DAMAGE",
        base: 8,
        stat: "int",
        mult: 1.1,
        status: { preventMovementTurns: 1 },
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_HIT",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 0, pad: 1 },
                durabilityCost: 0,
                description: "Al impactar, restaura 1 PAD."
            }
        ]
    }),
    spi_blue_tax: spirit({
        id: "spi_blue_tax",
        name: "Marea Pesada",
        identity: "BLUE",
        icon: "B3",
        maxDurability: 8,
        hasActive: false,
        passives: [
            {
                type: "PERSISTENT",
                effect: "ACTION_COST_MULTIPLIER",
                multiplier: 0.5,
                durabilityCost: 1,
                description: "Mientras este equipado, tus habilidades cuestan la mitad de PA-D/F."
            },
            {
                type: "PERSISTENT",
                effect: "MOVEMENT_COST_MULTIPLIER",
                multiplier: 2,
                durabilityCost: 0,
                description: "Mientras este equipado, tu movimiento cuesta el doble de PAD."
            }
        ]
    }),
    spi_blue_reflect: spirit({
        id: "spi_blue_reflect",
        name: "Eco Frio",
        identity: "BLUE",
        icon: "B4",
        maxDurability: 6,
        hasActive: false,
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ANY_ACTIVE_EXECUTE",
                effect: "MULTIPLY_DAMAGE",
                multiplier: 1.25,
                durabilityCost: 1,
                description: "Cuando cualquier habilidad activa se ejecute, esa habilidad hace x1.25 dano o cura x1.25."
            },
            {
                type: "TRIGGERED",
                trigger: "ON_ANY_ACTIVE_EXECUTE",
                effect: "DUPLICATE_ACTION_COST",
                durabilityCost: 0,
                description: "Cuando amplifica una habilidad, duplica su coste de PA-D/F si todavia quedan recursos."
            }
        ]
    }),
    spi_blue_final: spirit({
        id: "spi_blue_final",
        name: "Diluvio Absoluto",
        identity: "BLUE",
        icon: "B5",
        maxDurability: 3,
        costs: { paf: 2, pad: 1 },
        durabilityCost: 2,
        rangeType: "RADIAL",
        range: 5,
        targetMode: "TILE",
        effect: "DAMAGE",
        base: 20,
        stat: "int",
        mult: 1.8,
        area: { shape: "DIAMOND", radius: 2 },
        status: { preventMovementTurns: 1 },
        passives: [
            {
                type: "TRIGGERED",
                trigger: "ON_ACTIVE_HIT",
                effect: "RESTORE_RESOURCE",
                resources: { paf: 0, pad: 2 },
                durabilityCost: 0,
                description: "Al impactar, restaura 2 PAD."
            }
        ]
    })
});

export const SPIRIT_IDS = Object.freeze(Object.keys(SPIRITS));

export const PLAYER_INITIAL_SPIRIT_IDS = Object.freeze([
    "spi_orange_shot",
    "spi_red_cross",
    "spi_white_breath"
]);

export const PLAYER_BAG_SPIRIT_IDS = Object.freeze(
    SPIRIT_IDS.filter(id => !PLAYER_INITIAL_SPIRIT_IDS.includes(id))
);

export const PLAYER_BAG_WEAPON_IDS = Object.freeze([
    "wep_hook",
    "wep_knife",
    "wep_club",
    "wep_whip",
    "wep_crossbow"
]);

export const ITEMS_DB = Object.freeze({
    ...WEAPONS,
    ...SPIRITS
});

function getWeaponRangeLabel(range) {
    if (range <= 1) return "Melee";
    if (range <= 4) return "Mid";
    return "Ranged";
}

function getShortStatLabel(stat) {
    if (stat === "str") return "Fuerza";
    if (stat === "dex") return "Destreza";
    if (stat === "speed") return "Velocidad";
    return "Inteligencia";
}
