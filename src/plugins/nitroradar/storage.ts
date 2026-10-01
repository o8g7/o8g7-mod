import { createPluginStore } from "@api/storage";

interface NitroRadarSettings {
    ignoreOwnMessages: boolean;
    notifyForDMs: boolean;
    vibrate: boolean;
    ignoredGuilds: string;
    ignoredChannels: string;
    autoClaim: boolean;
    claimDelayMinMs: number;
    claimDelayMaxMs: number;
}

// Valeurs reprises de la configuration Equicord (playSound → vibration sur iPhone).
// autoClaim est DÉSACTIVÉ par défaut : Discord sanctionne la réclamation automatique de cadeaux.
export const { useStore: useNitroRadarSettings } = createPluginStore<NitroRadarSettings>("nitroradar", {
    ignoreOwnMessages: true,
    notifyForDMs: true,
    vibrate: true,
    ignoredGuilds: "",
    ignoredChannels: "",
    autoClaim: false,
    claimDelayMinMs: 1200,
    claimDelayMaxMs: 3500,
});
