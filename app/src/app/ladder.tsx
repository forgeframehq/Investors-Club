import { View } from 'react-native';

import { LADDER, level, POINTS, useStore } from '@/lib/store';
import { Emblem } from '@/ui/art';
import { Avatar } from '@/ui/avatar';
import { Bar, C, Card, Icon, Page, Row, Txt } from '@/ui/kit';

/** The progress ladder: six rungs from Rookie to Tycoon, where you are on it, and what earns points. */
export default function Ladder() {
  const { settings } = useStore();
  const lv = level();
  const here = lv.number - 1;
  return (
    <Page>
      <Card>
        <Row gap={12}>
          <Avatar id={settings.avatar} name={settings.name} size={52} />
          <Emblem level={lv.number} size={52} />
          <View style={{ flex: 1 }}>
            <Txt size={18} bold>{lv.name}</Txt>
            <Txt size={14} color={C.muted}>{lv.next ? `${lv.points} points · ${lv.next - lv.points} more to reach ${LADDER[here + 1].name}` : `${lv.points} points · you are at the top`}</Txt>
          </View>
        </Row>
        <Bar value={lv.progress} />
      </Card>

      <View>
        {[...LADDER].map((rung, i) => ({ rung, i })).reverse().map(({ rung, i }) => {
          const reached = i <= here;
          const current = i === here;
          return (
            <View key={rung.name} style={{ flexDirection: 'row', gap: 14 }}>
              {/* The rail of the ladder: a circle for the rung and a line down to the one below. */}
              <View style={{ alignItems: 'center', width: 72 }}>
                <View style={{ borderRadius: 20, borderWidth: 3, borderColor: current ? C.accent : 'transparent', padding: 2 }}>
                  <Emblem level={i + 1} size={62} dim={!reached} />
                </View>
                {i > 0 && <View style={{ width: 4, flex: 1, minHeight: 26, backgroundColor: i <= here ? C.accent : C.cardHi }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 18, gap: 2 }}>
                <Row gap={8}>
                  <Txt size={17} bold color={reached ? C.text : C.muted}>{rung.name}</Txt>
                  {current && (
                    <View style={{ backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Txt size={12} bold color={C.onAccent}>You are here</Txt>
                    </View>
                  )}
                  {reached && !current && <Icon name="checkmark-circle" size={18} color={C.accent} />}
                </Row>
                <Txt size={13} color={C.muted}>Level {i + 1} · {rung.points} points</Txt>
                <Txt size={14} color={reached ? C.text : C.muted}>{rung.about}</Txt>
              </View>
            </View>
          );
        })}
      </View>

      <Card>
        <Txt size={17} bold>How to climb</Txt>
        <Txt size={13} color={C.muted}>Points come from learning and good habits, never from trading more.</Txt>
        {POINTS.map((x) => (
          <Row key={x.what}>
            <Txt size={15} style={{ flex: 1 }}>{x.what}</Txt>
            <Txt size={15} bold color={C.accent}>+{x.points}</Txt>
          </Row>
        ))}
      </Card>
    </Page>
  );
}
