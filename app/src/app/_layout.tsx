import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';

import { syncPortfolio } from '@/lib/classroom';
import { loadLogos, probe, refreshQuotes } from '@/lib/market';
import { loadWebFonts } from '@/lib/fonts';
import { load, useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { C } from '@/ui/kit';
import { OverlayHost } from '@/ui/overlay';
import { Welcome } from '@/ui/welcome';

SplashScreen.preventAutoHideAsync().catch(() => {});
loadWebFonts();

export default function RootLayout() {
  const { ready, settings } = useStore();

  useEffect(() => {
    const update = () => {
      refreshQuotes();
      loadLogos();
      syncPortfolio().catch(() => {});
    };
    load().then(async () => {
      SplashScreen.hideAsync().catch(() => {});
      await probe();
      update();
    });
    // Prices refresh while the app is open and whenever it comes back to the front.
    const timer = setInterval(() => { if (AppState.currentState === 'active') refreshQuotes(); }, 60_000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') update(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, []);

  if (!ready) return null;
  return (
    <>
      <StatusBar style="dark" />
      {/* The key remounts every screen when the accent changes, so all of them pick up the new colour. */}
      {/* While the welcome steps are showing, screen readers skip the app underneath them. */}
      <View style={{ flex: 1 }} importantForAccessibility={settings.onboarded ? 'auto' : 'no-hide-descendants'}>
      <Stack
        key={settings.accent ?? 'default'}
        screenOptions={{
          headerStyle: { backgroundColor: C.bar },
          headerTintColor: C.text,
          headerTitleStyle: { fontFamily: F, fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: C.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="stock/[symbol]" options={{ title: 'Stock' }} />
        <Stack.Screen name="lesson/[id]" options={{ title: 'Lesson' }} />
        <Stack.Screen name="glossary" options={{ title: 'Glossary' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="market-data" options={{ title: 'Market data' }} />
        <Stack.Screen name="flashcards" options={{ title: 'Flashcards' }} />
        <Stack.Screen name="profile" options={{ title: 'Your profile' }} />
        <Stack.Screen name="teacher" options={{ title: 'For teachers' }} />
        <Stack.Screen name="teacher-class" options={{ title: 'Class' }} />
      </Stack>
      </View>
      {/* New students see the welcome steps on top of the app until they finish them. */}
      {!settings.onboarded && <Welcome />}
      <OverlayHost />
    </>
  );
}
