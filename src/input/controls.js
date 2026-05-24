import { COLS, ROWS, TILE_SIZE } from "../config.js";
import { centerCameraOnPlayer, panCamera } from "../systems/cameraSystem.js";
import { isTileInRange } from "../systems/targeting.js";

const CAMERA_DRAG_THRESHOLD = 5;
const CAMERA_RECENTER_HOLD_MS = 1000;

export function bindControls(state, canvas, callbacks) {
    let cameraGesture = null;
    let suppressNextClick = false;

    canvas.addEventListener("mousemove", event => {
        if (!cameraGesture && shouldStartCameraGestureFromMove(event)) {
            event.preventDefault();
            cameraGesture = startCameraGesture(state, canvas, event);
            startCameraDrag(cameraGesture, canvas);
            return;
        }

        if (cameraGesture) return;
        if (isInputLocked(state)) return;

        const tile = getTileFromEvent(state, canvas, event);
        state.hoverTile = tile;

        if (state.mode === "TARGETING" && tile && isTileInRange(state, tile.x, tile.y)) {
            canvas.style.cursor = "crosshair";
        } else {
            canvas.style.cursor = "pointer";
        }
    });

    canvas.addEventListener("mouseleave", () => {
        if (cameraGesture) return;
        state.hoverTile = null;
        canvas.style.cursor = "default";
    });

    canvas.addEventListener("click", event => {
        if (suppressNextClick) {
            event.preventDefault();
            suppressNextClick = false;
            return;
        }

        if (isInputLocked(state)) return;

        const tile = getTileFromEvent(state, canvas, event);
        if (!tile) return;

        if (state.mode === "TARGETING") {
            callbacks.onTarget(tile.x, tile.y);
        } else if (state.mode === "IDLE") {
            callbacks.onMove(tile.x, tile.y);
        }
    });

    canvas.addEventListener("mousedown", event => {
        if (!shouldStartCameraGesture(event) || cameraGesture) return;

        event.preventDefault();
        cameraGesture = startCameraGesture(state, canvas, event);
    });

    canvas.addEventListener("pointerdown", event => {
        if (cameraGesture) return;
        if (!shouldStartCameraGesture(event)) return;

        event.preventDefault();
        canvas.setPointerCapture?.(event.pointerId);
        cameraGesture = startCameraGesture(state, canvas, event);
    });

    canvas.addEventListener("contextmenu", event => {
        event.preventDefault();
    });

    canvas.addEventListener("auxclick", event => {
        if (event.button === 2) event.preventDefault();
    });

    window.addEventListener("mousemove", event => {
        if (!cameraGesture || cameraGesture.pointerId !== null) return;
        updateCameraGesture(state, canvas, cameraGesture, event);
    });

    window.addEventListener("mouseup", event => {
        if (!cameraGesture || cameraGesture.pointerId !== null) return;
        if (event.button !== cameraGesture.button) return;

        event.preventDefault();
        suppressNextClick = finishCameraGesture(cameraGesture, canvas, callbacks);
        cameraGesture = null;
    });

    canvas.addEventListener("pointermove", event => {
        if (!cameraGesture) return;
        updateCameraGesture(state, canvas, cameraGesture, event);
    });

    canvas.addEventListener("pointerup", event => {
        if (!cameraGesture || event.pointerId !== cameraGesture.pointerId) return;

        event.preventDefault();
        canvas.releasePointerCapture?.(event.pointerId);
        suppressNextClick = finishCameraGesture(cameraGesture, canvas, callbacks);
        cameraGesture = null;
    });

    canvas.addEventListener("pointercancel", event => {
        if (!cameraGesture || event.pointerId !== cameraGesture.pointerId) return;

        canvas.releasePointerCapture?.(event.pointerId);
        suppressNextClick = finishCameraGesture(cameraGesture, canvas, callbacks);
        cameraGesture = null;
    });

    window.addEventListener("keydown", event => {
        if (state.mode === "RESOLVING" || state.mode === "RESTING") return;

        if (event.key === "i" || event.key === "I") {
            callbacks.onToggleInventory();
        } else if (event.key === "Escape") {
            callbacks.onEscape?.();
        } else if (event.key === " " && state.mode === "IDLE") {
            event.preventDefault();
            callbacks.onEndTurn();
        } else if (["1", "2", "3", "4"].includes(event.key) && state.mode !== "MENU") {
            const actionIndex = Number(event.key) - 1;
            callbacks.onActionHotkey(actionIndex);
        }
    });
}

function startCameraGesture(state, canvas, event) {
    const gesture = {
        pointerId: event.pointerId ?? null,
        button: getGestureButton(event),
        cancelsOnTap: getGestureButton(event) === 2,
        startClientX: event.clientX,
        startClientY: event.clientY,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        moved: false,
        centered: false,
        holdTimer: null
    };

    canvas.style.cursor = "grab";
    gesture.holdTimer = window.setTimeout(() => {
        if (gesture.moved) return;

        gesture.centered = true;
        centerCameraOnPlayer(state, canvas);
        canvas.style.cursor = "default";
    }, CAMERA_RECENTER_HOLD_MS);

    return gesture;
}

function getGestureButton(event) {
    if (isSecondaryButtonHeld(event) || event.button === 2) return 2;
    if ((event.buttons & 4) === 4 || event.button === 1) return 1;
    return 0;
}

function updateCameraGesture(state, canvas, gesture, event) {
    event.preventDefault();

    const totalDeltaX = event.clientX - gesture.startClientX;
    const totalDeltaY = event.clientY - gesture.startClientY;
    const totalDistance = Math.hypot(totalDeltaX, totalDeltaY);

    if (!gesture.moved && totalDistance > CAMERA_DRAG_THRESHOLD) {
        startCameraDrag(gesture, canvas);
    }

    if (gesture.moved) {
        const scale = getCanvasScale(canvas);
        const deltaX = (event.clientX - gesture.lastClientX) * scale.x;
        const deltaY = (event.clientY - gesture.lastClientY) * scale.y;
        const direction = state.settings?.invertCameraDrag ? -1 : 1;
        panCamera(state, canvas, deltaX * direction, deltaY * direction);
        state.hoverTile = null;
    }

    gesture.lastClientX = event.clientX;
    gesture.lastClientY = event.clientY;
}

function startCameraDrag(gesture, canvas) {
    gesture.moved = true;
    window.clearTimeout(gesture.holdTimer);
    canvas.style.cursor = "grabbing";
}

function shouldStartCameraGesture(event) {
    return isSecondaryPointer(event) || isCameraFallbackPointer(event);
}

function shouldStartCameraGestureFromMove(event) {
    return isSecondaryButtonHeld(event) || isCameraFallbackButtonHeld(event);
}

function isSecondaryPointer(event) {
    return event.button === 2 || (event.buttons & 2) === 2;
}

function isSecondaryButtonHeld(event) {
    return (event.buttons & 2) === 2;
}

function isCameraFallbackPointer(event) {
    return event.button === 1 || (event.button === 0 && event.shiftKey);
}

function isCameraFallbackButtonHeld(event) {
    return (event.buttons & 4) === 4 || ((event.buttons & 1) === 1 && event.shiftKey);
}

function finishCameraGesture(gesture, canvas, callbacks) {
    window.clearTimeout(gesture.holdTimer);
    canvas.style.cursor = "default";

    if (!gesture.moved && !gesture.centered && gesture.cancelsOnTap) {
        callbacks.onCancelModes({ cancelPlannedRoute: true });
    }

    return gesture.moved || gesture.centered || !gesture.cancelsOnTap;
}

function isInputLocked(state) {
    return state.mode === "MENU" || state.mode === "MOVING" || state.mode === "RESOLVING" || state.mode === "RESTING";
}

function getTileFromEvent(state, canvas, event) {
    const bounds = canvas.getBoundingClientRect();
    const scale = getCanvasScale(canvas);
    const mouseX = (event.clientX - bounds.left) * scale.x + state.camera.x;
    const mouseY = (event.clientY - bounds.top) * scale.y + state.camera.y;
    const x = Math.floor(mouseX / TILE_SIZE);
    const y = Math.floor(mouseY / TILE_SIZE);

    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return null;
    return { x, y };
}

function getCanvasScale(canvas) {
    const bounds = canvas.getBoundingClientRect();
    return {
        x: canvas.width / bounds.width,
        y: canvas.height / bounds.height
    };
}
