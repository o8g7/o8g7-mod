import { createPluginStore } from "@api/storage";

interface ChatPlatformsSettings {
    showBots: boolean;
    showSelf: boolean;
}

// Valeurs reprises de PlatformIndicators (Equicord) : messages activés, bots masqués.
export const { useStore: useChatPlatformsSettings } = createPluginStore<ChatPlatformsSettings>("chatplatforms", {
    showBots: false,
    showSelf: true,
});
