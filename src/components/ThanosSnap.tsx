import { useEffect, useRef, useState, useMemo } from 'react';
import { View } from 'react-native';
import {
  Canvas, Atlas, Skia,
  type SkImage,
} from '@shopify/react-native-skia';
import { captureRef } from 'react-native-view-shot';
import {
  useSharedValue, withTiming, runOnJS, Easing,
  useDerivedValue,
} from 'react-native-reanimated';

const TARGET_CELL = 3;
const MAX_PARTICLES = 3000;
const DURATION = 1800;
const PADDING = 120;

type Props = {
  /** View to capture (the message bubble). When null/undefined — singleton renders nothing. */
  bubbleRef: View | null | undefined;
  /** True while user is hovering picker (capture snapshot in advance). */
  armed: boolean;
  /** True after user tapped Delete — triggers Canvas anim. */
  active: boolean;
  /** Called after particle anim finishes. */
  onComplete: () => void;
};

type Particle = {
  col: number;
  row: number;
  vx: number;
  vy: number;
  rot: number;
  delay: number;
};

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Singleton "Thanos snap" effect rendered at chat-screen level.
 * Captures bubble's view → renders particle Canvas overlay at its screen position.
 * Replaces the previous per-bubble ThanosSnap wrapper to drop 70× duplicated Skia/Reanimated infrastructure.
 */
export default function ThanosSnap({ bubbleRef, armed, active, onComplete }: Props) {
  const [snapshot, setSnapshot] = useState<SkImage | null>(null);
  const snapshotRef = useRef<SkImage | null>(null);
  const pendingCaptureRef = useRef<Promise<SkImage | null> | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const progress = useSharedValue(0);

  // Reset state when bubbleRef changes (different bubble selected)
  const lastBubbleRefRef = useRef<View | null | undefined>(null);
  if (lastBubbleRefRef.current !== bubbleRef) {
    lastBubbleRefRef.current = bubbleRef;
    snapshotRef.current = null;
    pendingCaptureRef.current = null;
    if (snapshot) setSnapshot(null);
    if (rect) setRect(null);
    progress.value = 0;
  }

  function measureBubble(): Promise<Rect | null> {
    return new Promise((resolve) => {
      if (!bubbleRef) { resolve(null); return; }
      try {
        bubbleRef.measureInWindow((x, y, w, h) => {
          if (typeof x === 'number' && typeof w === 'number' && w > 0 && h > 0) {
            resolve({ x, y, w, h });
          } else {
            resolve(null);
          }
        });
      } catch {
        resolve(null);
      }
    });
  }

  function captureSnapshot(): Promise<SkImage | null> {
    if (snapshotRef.current) return Promise.resolve(snapshotRef.current);
    if (pendingCaptureRef.current) return pendingCaptureRef.current;
    if (!bubbleRef) return Promise.resolve(null);
    const p = (async () => {
      try {
        const uri = await captureRef(bubbleRef, {
          format: 'jpg',
          quality: 0.9,
          result: 'tmpfile',
        } as any);
        const data = await Skia.Data.fromURI(uri);
        const img = Skia.Image.MakeImageFromEncoded(data);
        if (img) {
          snapshotRef.current = img;
          setSnapshot(img);
          return img;
        }
        return null;
      } finally {
        pendingCaptureRef.current = null;
      }
    })();
    pendingCaptureRef.current = p;
    return p;
  }

  // Pre-capture when armed
  useEffect(() => {
    if (!armed || !bubbleRef) return;
    if (snapshotRef.current && rect) {
      console.log('[Thanos] armed: snapshot already in ref, reuse');
      return;
    }
    const t0 = Date.now();
    console.log('[Thanos] armed → capture+measure start');
    (async () => {
      const r = await measureBubble();
      if (r) setRect(r);
      const img = await captureSnapshot();
      if (img) console.log('[Thanos] armed capture done in', Date.now() - t0, 'ms', 'rect=', r);
      else console.log('[Thanos] armed capture returned null');
    })().catch(e => console.log('[Thanos] armed error', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, bubbleRef]);

  // Trigger anim when active
  useEffect(() => {
    if (!active || !bubbleRef) return;
    let cancelled = false;
    (async () => {
      try {
        const hadSnapshot = !!snapshotRef.current;
        const hadRect = !!rect;
        console.log('[Thanos] active=true, hadSnapshot=', hadSnapshot, 'hadRect=', hadRect);
        let r = rect;
        if (!r) {
          r = await measureBubble();
          if (r) setRect(r);
        }
        const img = snapshotRef.current ?? await captureSnapshot();
        if (cancelled) return;
        if (!img || !r) { console.log('[Thanos] active: no img/rect → onComplete immediate'); onComplete(); return; }
        console.log('[Thanos] starting Canvas anim');
        progress.value = withTiming(
          1,
          { duration: DURATION, easing: Easing.out(Easing.quad) },
          (finished) => { if (finished) runOnJS(onComplete)(); },
        );
      } catch (e) {
        console.log('[Thanos] active error', e);
        onComplete();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, bubbleRef]);

  // Particles & sprites only computed when active (heavy work)
  const particlesData = useMemo(() => {
    if (!active || !rect) return { cols: 0, rows: 0, N: 0, particles: [] as Particle[] };
    let baseCols = Math.max(8, Math.floor(rect.w / TARGET_CELL));
    let baseRows = Math.max(4, Math.floor(rect.h / TARGET_CELL));
    if (baseCols * baseRows > MAX_PARTICLES) {
      const k = Math.sqrt((baseCols * baseRows) / MAX_PARTICLES);
      baseCols = Math.max(8, Math.floor(baseCols / k));
      baseRows = Math.max(4, Math.floor(baseRows / k));
    }
    const cols = baseCols;
    const rows = baseRows;
    const N = cols * rows;
    const particles: Particle[] = Array.from({ length: N }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 160;
      const drift = (Math.random() - 0.5) * 120;
      return {
        col, row,
        vx: Math.cos(angle) * speed + drift,
        vy: Math.sin(angle) * speed,
        rot: (Math.random() - 0.5) * Math.PI * 2,
        delay: (col / cols) * 0.55 + Math.random() * 0.25,
      };
    });
    return { cols, rows, N, particles };
  }, [active, rect]);

  const { cols, rows, N, particles } = particlesData;
  const cellW = cols > 0 && rect ? rect.w / cols : 0;
  const cellH = rows > 0 && rect ? rect.h / rows : 0;

  const sprites = useMemo(() => {
    if (!active || !snapshot || !rect || cols === 0 || rows === 0) return [];
    const sw = snapshot.width();
    const sh = snapshot.height();
    const sx = sw / rect.w;
    const sy = sh / rect.h;
    const cw = (rect.w / cols) * sx;
    const ch = (rect.h / rows) * sy;
    return particles.map(p => Skia.XYWHRect(p.col * cw, p.row * ch, cw, ch));
  }, [active, particles, snapshot, rect, cols, rows]);

  const transforms = useDerivedValue(() => {
    if (!active || N === 0 || !rect || !snapshot) return [];
    const out: ReturnType<typeof Skia.RSXform>[] = [];
    const sx = rect.w / snapshot.width();
    for (let i = 0; i < N; i++) {
      const p = particles[i];
      const localT = Math.max(0, Math.min(1, (progress.value - p.delay) / (1 - p.delay)));
      const tx = PADDING + p.col * cellW + p.vx * localT;
      const ty = PADDING + p.row * cellH + p.vy * localT;
      const baseScale = Math.max(0, 1 - localT);
      const angle = p.rot * localT;
      const cos = Math.cos(angle) * baseScale * sx;
      const sin = Math.sin(angle) * baseScale * sx;
      out.push(Skia.RSXform(cos, sin, tx, ty));
    }
    return out;
  });

  if (!active || !snapshot || !rect || N === 0 || sprites.length !== N) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: rect.x - PADDING,
        top: rect.y - PADDING,
        width: rect.w + PADDING * 2,
        height: rect.h + PADDING * 2,
      }}
    >
      <Canvas style={{ width: rect.w + PADDING * 2, height: rect.h + PADDING * 2 }}>
        <Atlas image={snapshot} sprites={sprites} transforms={transforms} />
      </Canvas>
    </View>
  );
}
