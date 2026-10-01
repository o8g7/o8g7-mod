import SettingsTextInput from "@api/ui/components/SettingsTextInput";
import { findByProps } from "@metro";
import { Stack, TableRowGroup, TableSwitchRow } from "@metro/common/components";
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
