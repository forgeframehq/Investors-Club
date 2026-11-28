import { useRouter } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/lib/store';

import { BermudaFlag } from './flag';
import { Btn, C, IconBtn, Row, Txt } from './kit';

/**
 * The bar across the top of every teacher screen. It marks the teacher area as its own place, apart from the
 * student app: its own title, the teacher's school, and a way back to the list of classes.
 */
export function TeacherBar({ back, max = 720 }: { back?: boolean; max?: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { teacher } = useStore();
  const narrow = useWindowDimensions().width < 520; // on a phone the button is just its icon, so the title fits
  return (
    <View style={{ backgroundColor: C.dark, paddingTop: insets.top }}>
      <Row gap={10} style={{ paddingHorizontal: 16, minHeight: 58, width: '100%', maxWidth: max, alignSelf: 'center' }}>
        {back && <IconBtn name="chevron-back" label="Back to my classes" color="#FFFFFF" onPress={() => (router.canGoBack() ? router.back() : router.replace('/teacher'))} />}
        <BermudaFlag width={26} />
        <View style={{ flex: 1 }}>
          <Txt size={16} bold color="#FFFFFF" lines={1}>Investors Club of Bermuda</Txt>
          <Txt size={12} color="#B9C7D4" lines={1}>Teacher area{teacher?.school ? ` · ${teacher.school}` : ''}</Txt>
        </View>
        {narrow
          ? <IconBtn name="phone-portrait-outline" label="Student app" color="#FFFFFF" onPress={() => router.replace('/')} />
          : <Btn title="Student app" kind="text" color="#FFFFFF" icon="phone-portrait-outline" onPress={() => router.replace('/')} />}
      </Row>
    </View>
  );
}
