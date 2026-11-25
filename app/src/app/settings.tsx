import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ACCENTS, DEFAULT_ACCENT } from '@/lib/theme';
import { setSetting, startOver, useStore } from '@/lib/store';
import { Avatar } from '@/ui/avatar';
import { Btn, C, Card, Icon, LinkRow, Page, Row, TapCard, Txt } from '@/ui/kit';
import { confirm } from '@/ui/overlay';

export default function Settings() {
  const router = useRouter();
  const { settings, cls } = useStore();
  const accent = settings.accent ?? DEFAULT_ACCENT;


  const signOut = async () => {
    if (!(await confirm('Sign out on this device?', 'Your class portfolio is saved by your class. To get back in, choose your school and class again and use the same name and PIN. Lessons done on this device start again.', 'Sign out', { danger: true }))) return;
    startOver();
    router.replace('/');
  };
  const theme = settings.theme ?? 'light';
  const pick = (title: string, on: boolean, press: () => void) => <Btn key={title} title={title} kind={on ? 'primary' : 'ghost'} style={{ flex: 1 }} height={44} onPress={press} />;

  return (
    <Page>
      <TapCard label="Edit your profile" onPress={() => router.push('/profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar id={settings.avatar} name={settings.name} size={52} />
        <View style={{ flex: 1 }}>
          <Txt size={18} bold>{settings.name || 'Your profile'}</Txt>
          <Txt size={13} color={C.muted}>Change your name or picture</Txt>
        </View>
        <Icon name="chevron-forward" size={20} color={C.muted} />
      </TapCard>

      <Txt size={18} bold>Reading level</Txt>
      <Row>
        <Btn title="Simple" kind={settings.level === 'simple' ? 'primary' : 'ghost'} style={{ flex: 1 }} height={44} onPress={() => setSetting('level', 'simple')} />
        <Btn title="Detailed" kind={settings.level === 'detailed' ? 'primary' : 'ghost'} style={{ flex: 1 }} height={44} onPress={() => setSetting('level', 'detailed')} />
      </Row>
      <Txt size={13} color={C.muted}>Simple suits younger students. Detailed adds the proper terms for older ones.</Txt>

      <Txt size={18} bold>Look</Txt>
      <Row>
        {pick('Light', theme === 'light', () => setSetting('theme', 'light'))}
        {pick('Dark', theme === 'dark', () => setSetting('theme', 'dark'))}
        {pick('Auto', theme === 'auto', () => setSetting('theme', 'auto'))}
      </Row>
      <Txt size={13} color={C.muted}>Auto follows your phone: dark when it is dark.</Txt>

      <Txt size={18} bold>Colour</Txt>
      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        {Object.entries(ACCENTS).map(([name, a]) => (
          <Pressable key={name} accessibilityRole="button" accessibilityLabel={`${name} colour`} onPress={() => setSetting('accent', name)}
            style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: a.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: accent === name ? C.text : 'transparent' }}>
            {accent === name && <Icon name="checkmark" color={a.onAccent} />}
          </Pressable>
        ))}
      </Row>

      <Txt size={18} bold>Text size</Txt>
      <Row>
        {pick('Normal', settings.textSize !== 'large', () => setSetting('textSize', 'normal'))}
        {pick('Large', settings.textSize === 'large', () => setSetting('textSize', 'large'))}
      </Row>

      <Txt size={18} bold>Movement</Txt>
      <Row>
        {pick('Full', !settings.lessMotion, () => setSetting('lessMotion', false))}
        {pick('Less', !!settings.lessMotion, () => setSetting('lessMotion', true))}
      </Row>
      <Txt size={13} color={C.muted}>Less movement stops the moving price tape and the flashcard flip.</Txt>

      {cls && (
        <>
          <Txt size={18} bold>This device</Txt>
          <View>
            <LinkRow icon="log-out-outline" title="Sign out" value={cls.name} onPress={signOut} />
          </View>
          <Txt size={13} color={C.muted}>Use this on a shared tablet so the next student can sign in.</Txt>
        </>
      )}

      <Card>
        <Txt size={15} bold>About Investors Club of Bermuda</Txt>
        <Txt size={14} color={C.muted}>A stock market game for schools in Bermuda. The money is practice money, not real. Prices are real US market prices in US dollars and can be a few minutes behind. One Bermuda dollar is worth the same as one US dollar. Nothing in this app is advice to buy or sell real investments.</Txt>
      </Card>
    </Page>
  );
}
