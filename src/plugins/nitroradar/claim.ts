/* Réclamation automatique d'un code cadeau — ⚠️ risqué pour le compte.
 *
 * Différences avec la version Equicord desktop :
 *  - pas de RestAPI : on passe par `fetch`, comme le fait déjà le plugin Decor de Rain ;
 *  - pas de `showNotification` cliquable : on affiche un toast ;
 *  - l'app doit être ouverte : sur iOS un plugin ne s'exécute jamais en arrière-plan.
 *
 * Garde-fous repris du script Equicord : jitter aléatoire, un seul essai par code,
 * annulation des délais en attente quand le plugin s'arrête ou que l'option est coupée. */

import { showToast } from "@api/ui/toasts";
import { logger } from "@lib/utils/logger";
import { ReactNative } from "@metro/common";

import { useNitroRadarSettings } from "./storage";

const API_BASE = "https://discord.com/api/v9";

let running = false;
/** Incrémenté à chaque start/stop : invalide les réclamations encore en attente. */
let lifecycle = 0;

interface PendingDelay {
    timer: ReturnType<typeof setTimeout>;
    resolve: (completed: boolean) => void;
}

const pendingDelays = new Set<PendingDelay>();
const inFlight = new Set<string>();

/** Annule tous les délais en attente (arrêt du plugin ou option désactivée). */
export function cancelPendingClaims() {
    for (const pending of pendingDelays) {
        clearTimeout(pending.timer);
        pending.resolve(false);
    }
    pendingDelays.clear();
}

export function startClaims() {
    running = true;
    lifecycle++;
}

export function stopClaims() {
    running = false;
    lifecycle++;
    cancelPendingClaims();
}

function waitForDelay(ms: number): Promise<boolean> {
    if (ms <= 0) return Promise.resolve(true);

    return new Promise(resolve => {
        const pending: PendingDelay = {
            timer: setTimeout(() => {
                pendingDelays.delete(pending);
                resolve(true);
            }, ms),
            resolve,
        };
        pendingDelays.add(pending);
    });
}

function canClaim(runId: number) {
    return running && lifecycle === runId && useNitroRadarSettings.getState().autoClaim;
}

/** Ne journalise jamais le code complet : un gift non réclamé vaut de l'argent. */
function redact(code: string) {
    if (code.length <= 8) return "••••••••";
    return `${code.slice(0, 4)}…${code.slice(-4)}`;
}

/** Délai tiré au hasard entre les deux bornes : une réclamation instantanée est le signal le plus voyant. */
function jitter() {
    const { claimDelayMinMs, claimDelayMaxMs } = useNitroRadarSettings.getState();
    const min = Math.max(0, claimDelayMinMs ?? 0);
    const max = Math.max(min, claimDelayMaxMs ?? min);
    return min + Math.floor(Math.random() * (max - min + 1));
}

function describeError(error: any, code: string) {
    const raw = error?.body?.message ?? error?.body?.code ?? error?.message ?? "échec inconnu";
    return String(raw).replaceAll(code, redact(code));
}

export async function autoClaimCode(code: string, channelId: string | null) {
    if (inFlight.has(code)) return;
    inFlight.add(code);

    const runId = lifecycle;
    const safeCode = redact(code);

    try {
        if (!await waitForDelay(jitter()) || !canClaim(runId)) return;

        // fetch de Rain : le jeton de session de l'app est joint automatiquement, comme pour l'API Decor.
        const response = await fetch(`${API_BASE}/entitlements/gift-codes/${encodeURIComponent(code)}/redeem`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel_id: channelId ?? null, payment_source_id: null }),
        });

        if (!canClaim(runId)) return;

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw body ?? new Error(`HTTP ${response.status}`);
        }

        if (useNitroRadarSettings.getState().vibrate) ReactNative.Vibration?.vibrate?.(400);
        showToast(`Nitro réclamé ✅ ${safeCode}`);
        logger.info(`[NitroRadar] Auto-claim OK: ${safeCode}`);
    } catch (error) {
        if (!canClaim(runId)) return;
        const reason = describeError(error, code);
        showToast(`Nitro non réclamé · ${safeCode} — ${reason}`);
        logger.warn(`[NitroRadar] Auto-claim KO: ${safeCode} — ${reason}`);
    } finally {
        inFlight.delete(code);
    }
}