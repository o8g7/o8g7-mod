import { createPluginStore } from "@api/storage";

interface NitroRadarSettings {
    ignoreOwnMessages: boolean;
    notifyForDMs: boolean;
    vibrate: boolean;
    ignoredGuilds: string;
    ignoredChannels: string;
}

// Valeurs reprises de la configuration Equicord (playSound → vibration sur iPhone).
export const { useStore: useNitroRadarSettings } = createPluginStore<NitroRadarSettings>("nitroradar", {
    ignoreOwnMessages: true,
    notifyForDMs: true,
    vibrate: true,
    ignoredGuilds: "",
    ignoredChannels: "",
});
