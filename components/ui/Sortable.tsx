import React, { useCallback, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '../../lib/cn';

type DragState = { from: number; over: number; dy: number; height: number } | null;

export type DragHandleProps = {
  onPointerDown: (event: React.PointerEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  'aria-label': string;
  role: string;
  tabIndex: number;
  onKeyDown: (event: React.KeyboardEvent) => void;
};

/**
 * Danh sách kéo-thả để sắp xếp, dùng Pointer Events nên chạy được cả chuột lẫn màn hình cảm ứng.
 * Kéo bằng tay nắm; bàn phím: focus tay nắm rồi dùng ↑/↓.
 */
export function SortableList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
  disabled,
  className,
}: {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (from: number, to: number) => void;
  renderItem: (item: T, index: number, handle: DragHandleProps, dragging: boolean) => React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const refs = useRef<Array<HTMLLIElement | null>>([]);
  const [drag, setDragState] = useState<DragState>(null);
  const dragRef = useRef<DragState>(null);
  const setDrag = (next: DragState | ((current: DragState) => DragState)) => {
    dragRef.current = typeof next === 'function' ? next(dragRef.current) : next;
    setDragState(dragRef.current);
  };
  const centers = useRef<number[]>([]);
  const startY = useRef(0);

  const start = useCallback(
    (index: number) => (event: React.PointerEvent) => {
      if (disabled || event.button > 0) return;
      event.preventDefault();
      const element = refs.current[index];
      if (!element) return;
      // Toạ độ theo tài liệu (cộng scrollY) để vẫn đúng khi trang tự cuộn trong lúc kéo.
      centers.current = refs.current.map(node => {
        const rect = node?.getBoundingClientRect();
        return rect ? rect.top + rect.height / 2 + window.scrollY : 0;
      });
      startY.current = event.clientY + window.scrollY;
      const height = element.getBoundingClientRect().height;
      setDrag({ from: index, over: index, dy: 0, height });
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);

      let lastClientY = event.clientY;
      let frame = 0;
      const update = () => {
        const dy = lastClientY + window.scrollY - startY.current;
        const center = centers.current[index] + dy;
        let over = index;
        centers.current.forEach((value, i) => {
          if (i < index && center < value) over = Math.min(over, i);
          if (i > index && center > value) over = Math.max(over, i);
        });
        setDrag(current => (current ? { ...current, dy, over } : current));
      };
      // Tự cuộn khi kéo sát mép trên/dưới màn hình.
      const EDGE = 90;
      const tick = () => {
        const speed = lastClientY < EDGE ? -(EDGE - lastClientY) / 4 : lastClientY > window.innerHeight - EDGE ? (lastClientY - (window.innerHeight - EDGE)) / 4 : 0;
        if (speed) {
          window.scrollBy(0, speed);
          update();
        }
        frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);

      const onMove = (move: PointerEvent) => {
        lastClientY = move.clientY;
        update();
      };
      const onUp = () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        const current = dragRef.current;
        setDrag(null);
        if (current && current.over !== current.from) onReorder(current.from, current.over);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [disabled, onReorder],
  );

  const shiftFor = (index: number) => {
    if (!drag || index === drag.from) return 0;
    if (drag.from < drag.over && index > drag.from && index <= drag.over) return -drag.height;
    if (drag.from > drag.over && index < drag.from && index >= drag.over) return drag.height;
    return 0;
  };

  return (
    <ol className={cn('relative', className)}>
      {items.map((item, index) => {
        const dragging = drag?.from === index;
        const handle: DragHandleProps = {
          onPointerDown: start(index),
          role: 'button',
          tabIndex: disabled ? -1 : 0,
          'aria-label': 'Kéo để đổi thứ tự (hoặc dùng phím mũi tên)',
          className: cn('touch-none select-none', disabled ? 'cursor-not-allowed opacity-40' : 'cursor-grab active:cursor-grabbing'),
          onKeyDown: event => {
            if (disabled) return;
            if (event.key === 'ArrowUp' && index > 0) {
              event.preventDefault();
              onReorder(index, index - 1);
            } else if (event.key === 'ArrowDown' && index < items.length - 1) {
              event.preventDefault();
              onReorder(index, index + 1);
            }
          },
        };
        return (
          <li
            key={getKey(item)}
            ref={node => {
              refs.current[index] = node;
            }}
            style={{
              // Chỉ đặt transform khi đang kéo: transform luôn bật sẽ tạo stacking context làm menu bị hàng sau che.
              transform: !drag ? undefined : dragging ? `translateY(${drag.dy}px)` : `translateY(${shiftFor(index)}px)`,
              transition: dragging ? 'none' : drag ? 'transform 160ms ease' : undefined,
              zIndex: dragging ? 5 : undefined,
              position: 'relative',
            }}
            className={cn(dragging && 'rounded-xl bg-surface shadow-pop ring-2 ring-primary/40')}
          >
            {renderItem(item, index, handle, dragging)}
          </li>
        );
      })}
    </ol>
  );
}

/** Biểu tượng tay nắm kéo-thả dùng chung. */
export const DragHandle: React.FC<DragHandleProps> = props => (
  <span {...props} className={cn('flex items-center justify-center rounded-lg p-1 text-faint hover:bg-sunken hover:text-fg focus-visible:outline-2', props.className)}>
    <GripVertical className="h-4 w-4" />
  </span>
);
