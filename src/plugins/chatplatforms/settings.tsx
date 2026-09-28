import { Stack, TableRowGroup, TableSwitchRow } from "@metro/common/components";
import { ScrollView } from "react-native";

import { useChatPlatformsSettings } from "./storage";

export default () => {
    const settings = useChatPlatformsSettings();
    const { updateSettings } = settings;

    return (
        <ScrollView style={{ flex: 1 }}>
            <Stack style={{ paddingVertical: 12, paddingHorizontal: 12 }} spacing={24}>
                <TableRowGroup title="Afficher dans le chat">
                    <TableSwitchRow
                        label="Mes propres messages"
                        value={settings.showSelf}
                        onValueChange={(v: boolean) => updateSettings({ showSelf: v })}
                    />
                    <TableSwitchRow
                        label="Les bots"
                        value={settings.showBots}
                        onValueChange={(v: boolean) => updateSettings({ showBots: v })}
                    />
                </TableRowGroup>
                <TableRowGroup title="Si la personne a déjà une icône de rôle">
                    <TableSwitchRow
                        label="Afficher les plateformes en emoji"
                        subLabel="Sinon, rien n'est affiché pour cette personne"
                        value={settings.emojiFallback}
                        onValueChange={(v: boolean) => updateSettings({ emojiFallback: v })}
                    />
                </TableRowGroup>
            </Stack>
        </ScrollView>
    );
};
