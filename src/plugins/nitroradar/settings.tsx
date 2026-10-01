import SettingsTextInput from "@api/ui/components/SettingsTextInput";
import { SliderRow } from "@api/ui/components/SliderRow";
import { findByProps } from "@metro";
import { Stack, TableRow, TableRowGroup, TableSwitchRow } from "@metro/common/components";
import { ScrollView } from "react-native";

import { useNitroRadarSettings } from "./storage";

const { Card } = findByProps("Card");

export default () => {
    const settings = useNitroRadarSettings();
    const { updateSettings } = settings;

    return (
        <ScrollView style={{ flex: 1 }}>
            <Stack style={{ paddingVertical: 12, paddingHorizontal: 12 }} spacing={24}>
                <TableRowGroup title="Détection">
                    <TableSwitchRow
                        label="Ignorer mes propres messages"
                        value={settings.ignoreOwnMessages}
                        onValueChange={(v: boolean) => updateSettings({ ignoreOwnMessages: v })}
                    />
                    <TableSwitchRow
                        label="Surveiller les messages privés"
                        value={settings.notifyForDMs}
                        onValueChange={(v: boolean) => updateSettings({ notifyForDMs: v })}
                    />
                    <TableSwitchRow
                        label="Vibrer"
                        value={settings.vibrate}
                        onValueChange={(v: boolean) => updateSettings({ vibrate: v })}
                    />
                </TableRowGroup>
                <TableRowGroup title="Réclamation automatique">
                    <TableSwitchRow
                        label="Réclamer le Nitro automatiquement"
                        subLabel="⚠️ RISQUE DE BANNISSEMENT : Discord repère la réclamation automatique de codes cadeaux."
                        value={settings.autoClaim}
                        onValueChange={(v: boolean) => updateSettings({ autoClaim: v })}
                    />
                    <Card>
                        <SliderRow
                            label="Délai minimum avant de réclamer"
                            value={settings.claimDelayMinMs}
                            minimumValue={0}
                            maximumValue={10000}
                            suffix=" ms"
                            onChange={(v: number) => updateSettings({ claimDelayMinMs: v })}
                        />
                    </Card>
                    <Card>
                        <SliderRow
                            label="Délai maximum avant de réclamer"
                            value={settings.claimDelayMaxMs}
                            minimumValue={0}
                            maximumValue={30000}
                            suffix=" ms"
                            onChange={(v: number) => updateSettings({ claimDelayMaxMs: v })}
                        />
                    </Card>
                    <TableRow
                        label="Comment ça marche"
                        subLabel={
                            "Un délai tiré au hasard entre les deux bornes précède chaque réclamation."
                            + " Un délai nul est instantané, donc le plus voyant. L'app doit rester ouverte :"
                            + " un plugin ne s'exécute pas en arrière-plan sur iOS."
                        }
                    />
                </TableRowGroup>
                <TableRowGroup title="Exclusions (IDs séparés par des virgules)">
                    <Card>
                        <SettingsTextInput
                            placeholder="Serveurs ignorés"
                            value={settings.ignoredGuilds}
                            onChange={(v: string) => updateSettings({ ignoredGuilds: v })}
                            isClearable
                        />
                    </Card>
                    <Card>
                        <SettingsTextInput
                            placeholder="Salons ignorés"
                            value={settings.ignoredChannels}
                            onChange={(v: string) => updateSettings({ ignoredChannels: v })}
                            isClearable
                        />
                    </Card>
                </TableRowGroup>
            </Stack>
        </ScrollView>
    );
};
