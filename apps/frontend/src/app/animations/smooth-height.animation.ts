import { animate, style, transition, trigger } from '@angular/animations';

export const SmoothHeightAnimation = trigger('grow', [
  transition('void <=> *', []),
  transition(
    '* <=> *',
    [
      style({ height: '{{startHeight}}px', opacity: 0 }),
      animate('.25s cubic-bezier(0.4, 0, 0.2, 1)')
    ],
    { params: { startHeight: 0 } }
  )
]);
