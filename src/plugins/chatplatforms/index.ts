/* ChatPlatforms : plateformes de l'auteur (🖥️ 📱 🌐 🎮) après son pseudo dans le chat, comme PlatformIndicators sur Equicord.
 * Le chat iOS est natif : ses seuls emplacements d'icône (rôle, tag de serveur, étiquette BOT) sont déjà
 * utilisés par Discord, donc les plateformes sont ajoutées en emoji au pseudo affiché. */
import { after } from "@api/patcher";
import { findByName } from "@metro";
import { PresenceStore, SessionsStore, UserStore } from "@metro/common/stores";
import { definePlugin } from "@plugins";

import settings from "./settings";
import { useChatPlatformsSettings } from "./storage";

const PLATFORM_ICONS: Record<string, string> = {
    desktop: "🖥️",
    mobile: "📱",
    web: "🌐",
    embedded: "🎮", // consoles, VR
};
const ORDER = ["desktop", "mobile", "web", "embedded"];

// Préfixe invisible : évite d'ajouter les icônes deux fois si la ligne est régénérée.
const MARK = "⁣";

const patches: (() => void)[] = [];

function getPlatforms(userId: string): string[] {
    let statuses: Record<string, string> | undefined;
    if (userId === UserStore.getCurrentUser()?.id) {
        // Pour soi-même, Discord ne publie pas clientStatuses : on lit ses sessions actives.
        const sessions = SessionsStore.getSessions?.() ?? {};
        statuses = {};
        for (const session of Object.values<any>(sessions)) {
            const client = session?.clientInfo?.client;
            if (client && client !== "unknown") statuses[client] = session.status;
        }
    } else {
        statuses = PresenceStore.getState?.()?.clientStatuses?.[userId];
    }
    if (!statuses) return [];
    return ORDER.filter(p => statuses![p] && statuses![p] !== "offline" && statuses![p] !== "invisible");
}

export default definePlugin({
    name: "ChatPlatforms",
    description: "Affiche les plateformes (ordinateur, mobile, web, console) après le pseudo dans le chat.",
    author: [{ name: "o8g7", id: 0n }],
    id: "chatplatforms",
    version: "1.0.0",
    start() {
        const RowManager = findByName("RowManager");
        if (!RowManager?.prototype?.generate) return;

        patches.push(after("generate", RowManager.prototype, ([row], result) => {
            try {
                const message = result?.message;
                if (row?.rowType !== 1 || !message?.username || !message.authorId) return;
                if (typeof message.username !== "string" || message.username.includes(MARK)) return;

                const opts = useChatPlatformsSettings.getState();
                if (!opts.showBots && row.message?.author?.bot) return;
                if (!opts.showSelf && message.authorId === UserStore.getCurrentUser()?.id) return;

                const icons = getPlatforms(message.authorId).map(p => PLATFORM_ICONS[p]);
                if (icons.length) message.username = `${message.username} ${MARK}${icons.join("")}`;
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
