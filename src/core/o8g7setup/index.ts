/* o8g7 : active les plugins choisis et pointe Rain vers le bundle o8g7, avant la vérification de version de Rain. */
import { useLoaderConfig, useSettings } from "@api/settings";
import { createPluginStore, waitForHydration } from "@api/storage";
import { logger } from "@lib/utils/logger";
import { definePlugin, usePluginSettings } from "@plugins";
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

// useLoaderConfig / useSettings n'exposent pas _hasHydrated : on passe par l'API persist de zustand.
// Délai maximal : ce plugin tourne au démarrage, il ne doit jamais bloquer l'app.
function persistReady(store: any, timeoutMs = 3000): Promise<void> {
    if (!store.persist || store.persist.hasHydrated()) return Promise.resolve();
    return new Promise(resolve => {
        const unsubscribe = store.persist.onFinishHydration(() => {
            unsubscribe();
            resolve();
        });
        setTimeout(() => {
            unsubscribe();
            resolve();
        }, timeoutMs);
    });
}

// À chaque lancement : Rain doit charger le bundle o8g7, et ses alertes « Rain pas à jour » /
// « version incompatible » (basées sur Codeberg) ne s'appliquent pas à cette compilation.
function ensureLoaderConfig() {
    const loader = useLoaderConfig.getState();
    if (BUNDLE_URL && (!loader.customLoadUrl?.enabled || loader.customLoadUrl.url !== BUNDLE_URL)) {
        loader.updateLoaderConfig({ customLoadUrl: { enabled: true, url: BUNDLE_URL } });
    }
    if (!useSettings.getState().disableUpdateWarnings) {
        useSettings.getState().updateSettings({ disableUpdateWarnings: true });
    }
}

async function applySetup() {
    await Promise.all([
        waitForHydration(useSetupState),
        waitForHydration(usePluginSettings),
        persistReady(useLoaderConfig),
        persistReady(useSettings),
        ...Object.values(PLUGIN_STORES).map(store => waitForHydration(store)),
    ]);

    ensureLoaderConfig();

    const state = useSetupState.getState();
    if (state.appliedVersion >= SETUP_VERSION) return;

    applyPluginSettings();

    // Un choix déjà fait dans l'app (activé ou désactivé) n'est jamais écrasé.
    // Pas de startPlugin ici : initPlugins démarre ensuite tous les plugins activés.
    const plugins = usePluginSettings.getState();
    for (const id of ENABLE_PLUGINS) {
        if (plugins.getPluginSetting(id) !== undefined) continue;
        plugins.updatePluginSetting(id, true);
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
    // eagerStart est attendu par Rain avant versionCheck() : la config est en place à temps.
    async eagerStart() {
        try {
            await applySetup();
        } catch (error) {
            logger.log("[o8g7] échec de la configuration :", error);
        }
    },
});
