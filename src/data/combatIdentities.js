export const IDENTITY_ORDER = Object.freeze(["BLACK", "RED", "ORANGE", "WHITE", "GREEN", "BLUE"]);

export const IDENTITY_LABELS = Object.freeze({
    BLACK: "Negro",
    RED: "Rojo",
    ORANGE: "Naranjo",
    WHITE: "Blanco",
    GREEN: "Verde",
    BLUE: "Azul"
});

export const IDENTITY_HEX = Object.freeze({
    BLACK: "#2d2d35",
    RED: "#c0392b",
    ORANGE: "#e67e22",
    WHITE: "#ecf0f1",
    GREEN: "#27ae60",
    BLUE: "#2980b9"
});

export function getIdentityDistance(sourceIdentity, targetIdentity) {
    const sourceIndex = IDENTITY_ORDER.indexOf(sourceIdentity);
    const targetIndex = IDENTITY_ORDER.indexOf(targetIdentity);

    if (sourceIndex === -1 || targetIndex === -1) return 0;

    const directDistance = Math.abs(sourceIndex - targetIndex);
    return Math.min(directDistance, IDENTITY_ORDER.length - directDistance);
}

export function getIdentityAffinity(sourceIdentity, targetIdentity) {
    const distance = getIdentityDistance(sourceIdentity, targetIdentity);

    if (distance === 0) {
        return {
            level: "MATCH",
            label: "Afin",
            resourceMultiplier: 1,
            durabilityMultiplier: 1,
            canEquip: true
        };
    }

    if (distance === 1) {
        return {
            level: "ADJACENT",
            label: "Contiguo",
            resourceMultiplier: 2,
            durabilityMultiplier: 1,
            canEquip: true
        };
    }

    if (distance === 2) {
        return {
            level: "DISTANT",
            label: "Distante",
            resourceMultiplier: 2,
            durabilityMultiplier: 2,
            canEquip: true
        };
    }

    return {
        level: "OPPOSITE",
        label: "Opuesto",
        resourceMultiplier: Number.POSITIVE_INFINITY,
        durabilityMultiplier: Number.POSITIVE_INFINITY,
        canEquip: false
    };
}
