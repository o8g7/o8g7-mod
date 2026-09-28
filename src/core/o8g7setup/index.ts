/* o8g7 : au premier lancement, active les plugins choisis et pointe Rain vers le bundle du serveur. */
import { useLoaderConfig } from "@api/settings";
import { createPluginStore, waitForHydration } from "@api/storage";
import { logger } from "@lib/utils/logger";
import { definePlugin, startPlugin, usePluginSettings } from "@plugins";
import { useMessageLoggerSettings } from "@plugins/messagelogger/storage";
import { usePlatformIndicatorSettings } from "@plugins/platformindicators/storage";

import { BUNDLE_URL, ENABLE_PLUGINS, PLUGIN_SETTINGS, SETUP_VERSION } from "./config";

const { useStore: useSetupState } = createPluginStore("o8g7setup", { appliedVersion: 0 });

// Réglages repris de la configuration Equicord (voir mod/o8g7.config.json).
const PLUGIN_STORES: Record<string, any> = {
    messagelogger: useMessageLoggerSettings,
    platformindicators: usePlatformIndicatorSettings,
};

function applyPluginSettings() {
    for (const [id, wanted] of Object.entries(PLUGIN_SETTINGS)) {
        const store = PLUGIN_STORES[id];
        if (!store) continue;
        const current = store.getState();
        const patch: Record<string, any> = {};
        // Fusion sur un niveau : les objets imbriqués (ex. filters) gardent leurs autres clés.
        for (const [key, value] of Object.entries(wanted)) {
            const isObject = value && typeof value === "object" && !Array.isArray(value);
            patch[key] = isObject ? { ...current[key], ...value } : value;
        }
        current.updateSettings(patch);
    }
}

// useLoaderConfig n'expose pas _hasHydrated : on passe par l'API persist de zustand.
function persistReady(store: any): Promise<void> {
    if (!store.persist || store.persist.hasHydrated()) return Promise.resolve();
    return new Promise(resolve => {
        const unsubscribe = store.persist.onFinishHydration(() => {
            unsubscribe();
            resolve();
        });
    });
}

async function applySetup() {
    await Promise.all([
        waitForHydration(useSetupState),
        waitForHydration(usePluginSettings),
        persistReady(useLoaderConfig),
        ...Object.values(PLUGIN_STORES).map(store => waitForHydration(store)),
    ]);

    const state = useSetupState.getState();
    if (state.appliedVersion >= SETUP_VERSION) return;

    applyPluginSettings();

    // Un choix déjà fait dans l'app (activé ou désactivé) n'est jamais écrasé.
    const plugins = usePluginSettings.getState();
    for (const id of ENABLE_PLUGINS) {
        if (plugins.getPluginSetting(id) !== undefined) continue;
        plugins.updatePluginSetting(id, true);
        startPlugin(id).catch(error => logger.log(`[o8g7] ${id} n'a pas démarré :`, error));
    }

    // Les mises à jour du mod viennent ensuite du serveur, pas de Codeberg.
    if (BUNDLE_URL) {
        useLoaderConfig.getState().updateLoaderConfig({
            customLoadUrl: { enabled: true, url: BUNDLE_URL },
        });
    }

    state.updateSettings({ appliedVersion: SETUP_VERSION });
    logger.log(`[o8g7] configuration v${SETUP_VERSION} appliquée`);
}

export default definePlugin({
    name: "o8g7",
    description: "Active les plugins o8g7 par défaut et règle l'URL de mise à jour du mod.",
    author: [{ name: "o8g7", id: 0n }],
    id: "o8g7setup",
    version: "1.0.0",
    start() {
        applySetup().catch(error => logger.log("[o8g7] échec de la configuration :", error));
    },
});
