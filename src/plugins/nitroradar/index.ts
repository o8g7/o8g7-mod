/* NitroRadar pour Rain : détection des liens cadeaux, notification, et réclamation automatique optionnelle.
 * L'auto-claim est DÉSACTIVÉ par défaut (Discord sanctionne la réclamation automatique de cadeaux). */
import { showToast } from "@api/ui/toasts";
import { FluxDispatcher, ReactNative } from "@metro/common";
import { ChannelStore, GuildStore, UserStore } from "@metro/common/stores";
import { definePlugin } from "@plugins";

import { autoClaimCode, cancelPendingClaims, startClaims, stopClaims } from "./claim";
import settings from "./settings";
import { useNitroRadarSettings } from "./storage";

const NITRO_REGEX = /(?:discord\.gift|discord(?:app)?\.com\/gifts)\/([a-zA-Z0-9-_]{16,24})/gi;

// Anti-doublon : on ne re-notifie pas le même (message, code).
const seen = new Set<string>();
const SEEN_MAX = 500;
function remember(key: string): boolean {
    if (seen.has(key)) return false;
    seen.add(key);
    if (seen.size > SEEN_MAX) {
        const first = seen.values().next().value;
        if (first !== undefined) seen.delete(first);
    }
    return true;
}

function idList(value: string): Set<string> {
    return new Set(value.split(",").map(s => s.trim()).filter(Boolean));
}

function extractCodes(message: any): string[] {
    const found = new Set<string>();
    const scan = (text?: string | null) => {
        if (!text) return;
        NITRO_REGEX.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = NITRO_REGEX.exec(text)) !== null) found.add(m[1]);
    };
    scan(message?.content);
    for (const embed of message?.embeds ?? []) {
        scan(embed?.url);
        scan(embed?.description);
        scan(embed?.rawDescription);
        scan(embed?.title);
        scan(embed?.rawTitle);
        for (const field of embed?.fields ?? []) {
            scan(field?.name);
            scan(field?.value);
        }
    }
    return [...found];
}

function onMessage(event: any) {
    try {
        const message = event?.message;
        if (!message?.id || event?.optimistic) return;
        const opts = useNitroRadarSettings.getState();

        const me = UserStore.getCurrentUser?.();
        if (opts.ignoreOwnMessages && me && message.author?.id === me.id) return;

        const channelId = message.channel_id ?? event.channelId;
        if (idList(opts.ignoredChannels).has(channelId)) return;
        const channel = ChannelStore.getChannel?.(channelId);
        const guildId = channel?.guild_id ?? event.guildId;
        if (!guildId && !opts.notifyForDMs) return;
        if (guildId && idList(opts.ignoredGuilds).has(guildId)) return;

        const codes = extractCodes(message);
        if (!codes.length) return;

        // Enregistrer tous les codes avant de décider : un seul toast par message.
        const unseen = codes.map(code => remember(`${message.id}:${code}`));
        if (!unseen.some(Boolean)) return;

        const where = guildId ? GuildStore.getGuild?.(guildId)?.name ?? "Serveur" : "Message privé";
        showToast(`Cadeau Nitro repéré · ${where}`);
        if (opts.vibrate) ReactNative.Vibration?.vibrate?.(400);

        if (opts.autoClaim) {
            for (const code of codes) void autoClaimCode(code, channelId);
        }
    } catch {
        // Ne pas interrompre la réception des messages si l'API interne change.
    }
}

export default definePlugin({
    name: "NitroRadar",
    description: "Signale les liens de cadeaux Nitro reçus (toast + vibration) et peut les réclamer automatiquement (⚠️ risqué, désactivé par défaut).",
    author: [{ name: "o8g7", id: 0n }],
    id: "nitroradar",
    version: "2.1.0",
    start() {
        startClaims();
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
    },
    stop() {
        stopClaims();
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
        seen.clear();
    },
    settings,
});
