import { createPluginStore } from "@api/storage";

interface ChatPlatformsSettings {
    showBots: boolean;
    showSelf: boolean;
    // Quand l'emplacement d'icône est déjà pris (icône de rôle) : emojis après le pseudo, ou rien.
    emojiFallback: boolean;
}

// Valeurs reprises de PlatformIndicators (Equicord) : messages activés, bots masqués.
export const { useStore: useChatPlatformsSettings } = createPluginStore<ChatPlatformsSettings>("chatplatforms", {
    showBots: false,
    showSelf: true,
    emojiFallback: false,
});
