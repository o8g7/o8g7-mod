/* ChatPlatforms : plateformes de l'auteur à côté de son pseudo dans le chat, comme PlatformIndicators sur Equicord.
 *
 * Le chat iOS est natif : on ne peut pas y dessiner de composant, seulement remplir les champs d'une ligne.
 * Le vrai logo (coloré selon le statut) est placé dans l'emplacement « icône de rôle » quand il est libre.
 * Son format n'étant pas documenté, il est appris sur une vraie icône de rôle vue dans le chat :
 * on copie cette structure et on ne remplace que l'image. Tant qu'aucune n'a été vue, rien n'est modifié. */
import { after } from "@api/patcher";
import { findByName } from "@metro";
import { PresenceStore, SessionsStore, UserStore } from "@metro/common/stores";
import { BUNDLE_URL } from "@plugins/_core/o8g7setup/config";
import { definePlugin } from "@plugins";

import settings from "./settings";
import { useChatPlatformsSettings } from "./storage";

// Ordre de priorité : une seule icône tient dans l'emplacement.
const ORDER = ["desktop", "vr", "embedded", "web", "mobile"];
const LABELS: Record<string, string> = {
    desktop: "Ordinateur",
    vr: "VR",
    embedded: "Console",
    web: "Navigateur",
    mobile: "Mobile",
};
const EMOJIS: Record<string, string> = { desktop: "🖥️", vr: "🥽", embedded: "🎮", web: "🌐", mobile: "📱" };
const STATUSES = new Set(["online", "idle", "dnd"]);

// Logos hébergés à côté du bundle (dépôt o8g7-mod) : assets/platforms/<plateforme>-<statut>.png
const ASSETS_URL = BUNDLE_URL.replace(/[^/]*$/, "assets/platforms/");

// Préfixe invisible : évite d'ajouter les emojis deux fois si la ligne est régénérée.
const MARK = "⁣";

const patches: (() => void)[] = [];
let roleIconTemplate: any = null;

function getStatuses(userId: string): Record<string, string> {
    if (userId === UserStore.getCurrentUser()?.id) {
        // Pour soi-même, Discord ne publie pas clientStatuses : on lit ses sessions actives.
        const statuses: Record<string, string> = {};
        for (const session of Object.values<any>(SessionsStore.getSessions?.() ?? {})) {
            const client = session?.clientInfo?.client;
            if (client && client !== "unknown") statuses[client] = session.status;
        }
        return statuses;
    }
    return PresenceStore.getState?.()?.clientStatuses?.[userId] ?? {};
}

function activePlatforms(userId: string): [string, string][] {
    const statuses = getStatuses(userId);
    return ORDER.filter(p => STATUSES.has(statuses[p])).map(p => [p, statuses[p]]);
}

function hasImageUrl(value: any): boolean {
    if (typeof value === "string") return /^https?:\/\//.test(value);
    if (value && typeof value === "object") return Object.values(value).some(hasImageUrl);
    return false;
}

// Copie la structure de la vraie icône de rôle en remplaçant ses URLs par celle du logo.
function withUrl(template: any, url: string, label: string): any {
    if (typeof template === "string") return /^https?:\/\//.test(template) ? url : template;
    if (Array.isArray(template)) return template.map(v => withUrl(v, url, label));
    if (!template || typeof template !== "object") return template;
    const copy: Record<string, any> = {};
    for (const [key, value] of Object.entries(template)) {
        if (/emoji/i.test(key)) copy[key] = null;
        else if (/^(name|alt|label|title|accessibilityLabel)$/i.test(key) && typeof value === "string") copy[key] = label;
        // Les autres champs (id de rôle compris) sont gardés : un champ manquant pourrait empêcher la ligne de s'afficher.
        else copy[key] = withUrl(value, url, label);
    }
    return copy;
}

export default definePlugin({
    name: "ChatPlatforms",
    description: "Logos de plateforme (ordinateur, VR, console, web, mobile) à côté du pseudo dans le chat.",
    author: [{ name: "o8g7", id: 0n }],
    id: "chatplatforms",
    version: "2.0.0",
    start() {
        const RowManager = findByName("RowManager");
        if (!RowManager?.prototype?.generate) return;

        patches.push(after("generate", RowManager.prototype, ([row], result) => {
            try {
                const message = result?.message;
                if (row?.rowType !== 1 || !message?.authorId) return;

                const slotTaken = message.roleIcon != null;
                if (!roleIconTemplate && slotTaken && hasImageUrl(message.roleIcon)) {
                    roleIconTemplate = message.roleIcon;
                }

                const opts = useChatPlatformsSettings.getState();
                if (!opts.showBots && row.message?.author?.bot) return;
                if (!opts.showSelf && message.authorId === UserStore.getCurrentUser()?.id) return;

                const platforms = activePlatforms(message.authorId);
                if (!platforms.length) return;

                if (!slotTaken && roleIconTemplate) {
                    const [platform, status] = platforms[0];
                    const others = platforms.slice(1).map(([p]) => LABELS[p]);
                    const label = [LABELS[platform], ...others].join(", ");
                    message.roleIcon = withUrl(roleIconTemplate, `${ASSETS_URL}${platform}-${status}.png`, label);
                    return;
                }

                if (opts.emojiFallback && typeof message.username === "string" && !message.username.includes(MARK)) {
                    message.username = `${message.username} ${MARK}${platforms.map(([p]) => EMOJIS[p]).join("")}`;
                }
            } catch {
                // Ne jamais casser l'affichage du chat si la structure interne change.
            }
        }));
    },
    stop() {
        for (const unpatch of patches) unpatch();
        patches.length = 0;
    },
    settings,
});
