'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

export type SheetSnap = 'peek' | 'half' | 'full';

interface BottomSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** peek 态露出的内容（不可滚动，常驻可见） */
  peekContent: ReactNode;
  /** half / full 态展开的主体（可滚动） */
  children: ReactNode;
}

const SNAP_HEIGHTS = {
  peek: 132, // 露出搜索栏 + 最近芯片
  half: 0.55, // 视口高度的 55%
  full: 0.92, // 视口高度的 92%
};

/**
 * 移动端底部抽屉 —— 拖拽 + snap 到三档
 * - peek（窥视）：常驻底部，露出搜索栏和最近 N 项
 * - half（半屏）：默认浏览态
 * - full（全屏）：专注查看
 *
 * 实现要点：
 * - 用 transform: translateY 控制高度（性能好）
 * - 拖拽中：跟手位移；松手：按速度+距离决定吸附档位
 * - 仅 grabber 区域响应拖拽，列表内容正常滚动（避免冲突）
 */
export default function BottomSheet({
  snap,
  onSnapChange,
  peekContent,
  children,
}: BottomSheetProps) {
  const [vh, setVh] = useState(0);
  const [dragOffset, setDragOffset] = useState(0); // 拖拽中临时位移
  const dragStateRef = useRef<{
    startY: number;
    startTime: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const getHeight = useCallback(
    (s: SheetSnap) => {
      if (s === 'peek') return SNAP_HEIGHTS.peek;
      return Math.round(vh * (s === 'half' ? SNAP_HEIGHTS.half : SNAP_HEIGHTS.full));
    },
    [vh]
  );

  const currentHeight = getHeight(snap);
  // dragOffset > 0 表示向下拖（缩小）
  const visualHeight = Math.max(60, currentHeight - dragOffset);

  // 触摸/指针事件
  const handlePointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      startY: e.clientY,
      startTime: Date.now(),
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const s = dragStateRef.current;
    if (!s) return;
    const delta = e.clientY - s.startY;
    if (Math.abs(delta) > 4) s.moved = true;
    setDragOffset(delta);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const s = dragStateRef.current;
    if (!s) return;
    dragStateRef.current = null;

    const delta = e.clientY - s.startY;
    const duration = Date.now() - s.startTime;
    const velocity = delta / Math.max(duration, 1); // px / ms

    setDragOffset(0);

    // 如果几乎没动，按点击处理（peek ↔ half 切换）
    if (!s.moved) {
      if (snap === 'peek') onSnapChange('half');
      else if (snap === 'half') onSnapChange('peek');
      return;
    }

    // 快速向下甩 → 下一档（缩小）
    // 快速向上甩 → 上一档（放大）
    const order: SheetSnap[] = ['peek', 'half', 'full'];
    const idx = order.indexOf(snap);
    let nextIdx = idx;

    if (Math.abs(velocity) > 0.5) {
      // 速度足够大：直接基于速度判断
      nextIdx = velocity > 0 ? idx - 1 : idx + 1;
    } else {
      // 慢拖：找最近的档位
      const newHeight = currentHeight - delta;
      const heights = order.map(getHeight);
      let best = idx;
      let bestDist = Infinity;
      heights.forEach((h, i) => {
        const d = Math.abs(h - newHeight);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      nextIdx = best;
    }

    nextIdx = Math.max(0, Math.min(order.length - 1, nextIdx));
    onSnapChange(order[nextIdx]);
  };

  const isDragging = dragStateRef.current !== null;

  return (
    <div
      className="lg:hidden fixed left-0 right-0 bottom-0 z-30 bg-white shadow-elevated rounded-t-2xl flex flex-col"
      style={{
        height: visualHeight,
        transition: isDragging
          ? 'none'
          : 'height 300ms cubic-bezier(0.22, 1, 0.36, 1)',
        paddingBottom: 'var(--safe-bottom)',
      }}
    >
      {/* Grabber + 拖拽区（包含 peekContent） */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        {/* 把手 */}
        <div className="pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        {/* peek 内容：仅 peek 态显示，展开后让位给主体 */}
        <div
          style={{
            maxHeight: snap === 'peek' ? '200px' : '0',
            opacity: snap === 'peek' ? 1 : 0,
            overflow: 'hidden',
            transition: isDragging
              ? 'none'
              : 'max-height 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms',
          }}
        >
          {peekContent}
        </div>
      </div>

      {/* 主体（可滚动）：仅展开态显示 */}
      <div
        className="flex-1 min-h-0 overflow-hidden"
        style={{
          opacity: snap === 'peek' ? 0 : 1,
          transition: 'opacity 200ms',
          pointerEvents: snap === 'peek' ? 'none' : 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
