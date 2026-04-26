import { useEffect, useRef, useState, useMemo, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
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
  active: boolean;
  armed?: boolean;
  onComplete: () => void;
  children: ReactNode;
};

type Particle = {
  col: number;
  row: number;
  vx: number;
  vy: number;
  rot: number;
  delay: number;
};

export default function ThanosSnap({ active, armed, onComplete, children }: Props) {
  const viewRef = useRef<View>(null);
  const [snapshot, setSnapshot] = useState<SkImage | null>(null);
  const snapshotRef = useRef<SkImage | null>(null);
  const capturingRef = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const progress = useSharedValue(0);

  async function captureSnapshot(): Promise<SkImage | null> {
    if (snapshotRef.current) return snapshotRef.current;
    if (capturingRef.current) return null;
    capturingRef.current = true;
    try {
      const uri = await captureRef(viewRef, {
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
      } as any);
      const data = await Skia.Data.fromURI(uri);
      const img = Skia.Image.MakeImageFromEncoded(data);
      if (img) {
        snapshotRef.current = img;
        return img;
      }
      return null;
    } finally {
      capturingRef.current = false;
    }
  }

  let baseCols = size.w > 0 ? Math.max(8, Math.floor(size.w / TARGET_CELL)) : 0;
  let baseRows = size.h > 0 ? Math.max(4, Math.floor(size.h / TARGET_CELL)) : 0;
  if (baseCols * baseRows > MAX_PARTICLES) {
    const k = Math.sqrt((baseCols * baseRows) / MAX_PARTICLES);
    baseCols = Math.max(8, Math.floor(baseCols / k));
    baseRows = Math.max(4, Math.floor(baseRows / k));
  }
  const cols = baseCols;
  const rows = baseRows;
  const N = cols * rows;

  const particles = useMemo<Particle[]>(() => {
    if (N === 0) return [];
    return Array.from({ length: N }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 160;
      const drift = (Math.random() - 0.5) * 120;
      return {
        col,
        row,
        vx: Math.cos(angle) * speed + drift,
        vy: Math.sin(angle) * speed,
        rot: (Math.random() - 0.5) * Math.PI * 2,
        delay: (col / cols) * 0.55 + Math.random() * 0.25,
      };
    });
  }, [cols, rows, N]);

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) {
      setSize({ w: width, h: height });
    }
  }

  useEffect(() => {
    if (!armed) return;
    if (size.w === 0 || size.h === 0) return;
    if (snapshotRef.current) return;
    let cancelled = false;
    (async () => {
      try { await captureSnapshot(); } catch {}
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, size.w, size.h]);

  useEffect(() => {
    if (!active) return;
    if (size.w === 0 || size.h === 0) return;
    let cancelled = false;
    (async () => {
      try {
        let img = snapshotRef.current;
        if (!img) img = await captureSnapshot();
        if (cancelled) return;
        if (!img) { onComplete(); return; }
        setSnapshot(img);
        progress.value = withTiming(
          1,
          { duration: DURATION, easing: Easing.out(Easing.quad) },
          (finished) => {
            if (finished) runOnJS(onComplete)();
          },
        );
      } catch {
        onComplete();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, size.w, size.h]);

  const cellW = cols > 0 ? size.w / cols : 0;
  const cellH = rows > 0 ? size.h / rows : 0;

  const sprites = useMemo(() => {
    if (!size.w || !size.h || !snapshot || cols === 0 || rows === 0) return [];
    const sw = snapshot.width();
    const sh = snapshot.height();
    const sx = sw / size.w;
    const sy = sh / size.h;
    const cw = (size.w / cols) * sx;
    const ch = (size.h / rows) * sy;
    return particles.map(p => Skia.XYWHRect(p.col * cw, p.row * ch, cw, ch));
  }, [particles, snapshot, size.w, size.h, cols, rows]);

  const transforms = useDerivedValue(() => {
    const out: ReturnType<typeof Skia.RSXform>[] = [];
    for (let i = 0; i < N; i++) {
      const p = particles[i];
      const localT = Math.max(0, Math.min(1, (progress.value - p.delay) / (1 - p.delay)));
      const tx = PADDING + p.col * cellW + p.vx * localT;
      const ty = PADDING + p.row * cellH + p.vy * localT;
      const baseScale = Math.max(0, 1 - localT);
      const angle = p.rot * localT;
      const sx = snapshot ? size.w / snapshot.width() : 1;
      const cos = Math.cos(angle) * baseScale * sx;
      const sin = Math.sin(angle) * baseScale * sx;
      out.push(Skia.RSXform(cos, sin, tx, ty));
    }
    return out;
  });


  if (active && snapshot && size.w > 0 && size.h > 0 && N > 0 && sprites.length === N) {
    return (
      <View style={{ width: size.w, height: size.h }}>
        <Canvas
          style={{
            position: 'absolute',
            left: -PADDING,
            top: -PADDING,
            width: size.w + PADDING * 2,
            height: size.h + PADDING * 2,
          }}
        >
          <Atlas image={snapshot} sprites={sprites} transforms={transforms} />
        </Canvas>
      </View>
    );
  }

  return (
    <View ref={viewRef} collapsable={false} onLayout={handleLayout}>
      {children}
    </View>
  );
}
