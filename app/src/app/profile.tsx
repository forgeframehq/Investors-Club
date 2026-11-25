import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { syncPortfolio } from '@/lib/classroom';
import { level, setSetting, useStore } from '@/lib/store';
import { Avatar, AvatarPicker } from '@/ui/avatar';
import { Emblem } from '@/ui/art';
import { Btn, C, Card, Field, Page, Row, Txt } from '@/ui/kit';

/** Change your name and picture. In a class, the picture also shows on the leaderboard. */
export default function Profile() {
  const router = useRouter();
  const { settings, cls } = useStore();
  const [name, setName] = useState(settings.name);
  const lv = level();

  const saveName = (text: string) => {
    setName(text);
    if (text.trim().length >= 2) setSetting('name', text.trim());
  };
  const savePicture = (id: string) => {
    setSetting('avatar', id);
    syncPortfolio().catch(() => {}); // the leaderboard catches up next time there is a connection
  };

  return (
    <Page>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <Avatar id={settings.avatar} name={settings.name} size={96} />
        <Txt size={22} bold>{settings.name || 'Investor'}</Txt>
        <Row gap={8}>
          <Emblem level={lv.number} size={34} />
          <Txt size={14} color={C.muted}>Rank {lv.number}: {lv.name}</Txt>
        </Row>
      </View>
      <Btn title="See my progress ladder" kind="ghost" icon="podium-outline" onPress={() => router.push('/ladder')} />
      <Txt size={18} bold>Name</Txt>
      <Field accessibilityLabel="Your first name" placeholder="First name" value={name} onChangeText={saveName} maxLength={20} autoCorrect={false} autoCapitalize="words" />
      {!!cls && <Txt size={13} color={C.muted}>Your class knows you as {cls.name}. That name stays the same so you keep your class portfolio.</Txt>}
      <Txt size={18} bold>Picture</Txt>
      <Card>
        <AvatarPicker value={settings.avatar} onChange={savePicture} />
      </Card>
    </Page>
  );
}
