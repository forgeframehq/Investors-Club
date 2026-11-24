import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

/**
 * The flag of Bermuda, drawn small: a red field with the Union Flag in the corner and the shield from the coat
 * of arms. Simplified to read at icon size (the shield's lion and ship become plain shapes).
 */
export function BermudaFlag({ width = 30 }: { width?: number }) {
  const height = width / 2;
  return (
    <Svg width={width} height={height} viewBox="0 0 60 30" accessibilityLabel="Flag of Bermuda">
      <Defs>
        <ClipPath id="bm-corner"><Rect x={0} y={0} width={30} height={15} /></ClipPath>
        <ClipPath id="bm-round"><Rect x={0} y={0} width={60} height={30} rx={3} /></ClipPath>
      </Defs>
      <G clipPath="url(#bm-round)">
        <Rect x={0} y={0} width={60} height={30} fill="#CF142B" />
        <G clipPath="url(#bm-corner)">
          <Rect x={0} y={0} width={30} height={15} fill="#00247D" />
          <Path d="M0,0 L30,15 M30,0 L0,15" stroke="#FFFFFF" strokeWidth={3} />
          <Path d="M0,0 L30,15 M30,0 L0,15" stroke="#CF142B" strokeWidth={1.2} />
          <Path d="M15,0 V15 M0,7.5 H30" stroke="#FFFFFF" strokeWidth={5} />
          <Path d="M15,0 V15 M0,7.5 H30" stroke="#CF142B" strokeWidth={3} />
        </G>
        {/* The shield: white, with a green base and a red figure. */}
        <Path d="M39,9 H51 V17 C51,21.5 48,23.5 45,25 C42,23.5 39,21.5 39,17 Z" fill="#FFFFFF" />
        <Path d="M39.6,19.5 H50.4 C49.6,21.8 47.4,23.3 45,24.4 C42.6,23.3 40.4,21.8 39.6,19.5 Z" fill="#2E8B57" />
        <Path d="M42.5,12 H47.5 V17 C47.5,18.4 46.4,19.4 45,19.4 C43.6,19.4 42.5,18.4 42.5,17 Z" fill="#CF142B" />
      </G>
    </Svg>
  );
}
