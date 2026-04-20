import Svg, { Polyline, Line, Path, Circle, Polygon, Rect } from 'react-native-svg';

const stroke = '#fff';
const s = '2';
const s25 = '2.5';

type IconProps = { size?: number; color?: string; strokeWidth?: string };

export function IconBack({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="15 18 9 12 15 6" stroke={color} strokeWidth={s25} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconSmile({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={s} />
      <Path d="M8 14s1.5 2 4 2 4-2 4-2" stroke={color} strokeWidth={s} strokeLinecap="round" />
      <Line x1="9" y1="9" x2="9.01" y2="9" stroke={color} strokeWidth={s} strokeLinecap="round" />
      <Line x1="15" y1="9" x2="15.01" y2="9" stroke={color} strokeWidth={s} strokeLinecap="round" />
    </Svg>
  );
}

export function IconPaperclip({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconMic({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="19" x2="12" y2="23" stroke={color} strokeWidth={s} strokeLinecap="round" />
      <Line x1="8" y1="23" x2="16" y2="23" stroke={color} strokeWidth={s} strokeLinecap="round" />
    </Svg>
  );
}

export function IconSend({ size = 18, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="22" y1="2" x2="11" y2="13" stroke={color} strokeWidth={s25} strokeLinecap="round" />
      <Polygon points="22 2 15 22 11 13 2 9 22 2" stroke={color} strokeWidth={s25} fill={color} strokeLinejoin="round" />
    </Svg>
  );
}

export function IconPhone({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconPin({ size = 16, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={s} />
    </Svg>
  );
}

export function IconReply({ size = 16, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="9 14 4 9 9 4" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 20v-7a4 4 0 0 0-4-4H4" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconPlay({ size = 20, color = '#667eea' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="6 3 20 12 6 21" fill={color} />
    </Svg>
  );
}

export function IconPause({ size = 20, color = '#667eea' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="5" y="3" width="4" height="18" rx="1" fill={color} />
      <Rect x="15" y="3" width="4" height="18" rx="1" fill={color} />
    </Svg>
  );
}

export function IconVideoNote({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={s} />
      <Circle cx="12" cy="12" r="4" fill={color} />
    </Svg>
  );
}

export function IconMenu({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="1.5" fill={color} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Circle cx="12" cy="19" r="1.5" fill={color} />
    </Svg>
  );
}

// Context menu icons — SVG из web-source/modules/chat.js sRC()

export function IconCtxReply({ size = 20, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="9 14 4 9 9 4" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 20v-7a4 4 0 0 0-4-4H4" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCtxCopy({ size = 20, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCtxForward({ size = 20, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="15 14 20 9 15 4" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 20v-7a4 4 0 0 1 4-4h12" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCtxPin({ size = 20, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCtxEdit({ size = 20, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCtxDelete({ size = 20, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="3 6 5 6 21 6" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCtxPrivate({ size = 20, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="22 6 12 13 2 6" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Reply bar icons — SVG из web-source/modules/template.html #rpb

export function IconReplyBar({ size = 18, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
    </Svg>
  );
}

export function IconClose({ size = 16, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={s} strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={s} strokeLinecap="round" />
    </Svg>
  );
}

export function IconVideoCamera({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon points="23 7 16 12 23 17 23 7" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconChat({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCheck({ size = 20, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={s25} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Call screen icons — точная копия из web-source/modules/CallManager.js

export function IconCallSpeaker({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon points="11 5 6 9 2 9 2 15 6 15 11 19" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke={color} strokeWidth={s} strokeLinecap="round" />
      <Path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke={color} strokeWidth={s} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCallVideo({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon points="23 7 16 12 23 17 23 7" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="1" y="5" width="15" height="14" rx="2" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="1" y1="1" x2="23" y2="23" stroke={color} strokeWidth={s} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCallMic({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="19" x2="12" y2="23" stroke={color} strokeWidth={s} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCallFlip({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 4v6h-6" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M1 20v-6h6" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCallHangup({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.11 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" stroke={color} strokeWidth={s25} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="23" y1="1" x2="1" y2="23" stroke={color} strokeWidth={s25} strokeLinecap="round" />
    </Svg>
  );
}
