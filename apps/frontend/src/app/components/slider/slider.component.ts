import { DOCUMENT, isPlatformBrowser, NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
  PLATFORM_ID,
  Renderer2,
  ViewChild,
  forwardRef,
  inject
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomHandler } from 'primeng/dom';

export interface SliderChangeEvent {
  event: Event;
  values?: number[];
  value?: number;
}

export interface SliderSlideEndEvent {
  originalEvent: Event;
  value?: number;
  values?: number[];
}

/**
 * Draggable slider component.
 *
 * Based off of PrimeNG https://primeng.org/slider
 * Step + Range combo was behaving weirdly so I just pulled it into our codebase
 * and cleaned it up a bit.
 *
 * I got rid of some stuff like animations and vertical mode, since they
 * overcomplicate things and I doubt we'll ever use them, reference the original
 * if we ever need to add back.
 */
@Component({
  selector: 'm-slider',
  template: `
    <!-- This styling is terrible, full of constants and absolute positioning.
         Doing it well with the fucking number markers would probably take me
         hours, and we only use this in one place currently. -->
    @if (markers) {
      <div class="relative h-4 w-full pointer-events-none select-none">
        @for (marker of markers; track $index) {
          <!-- Hate these bastards. -->
          <p
            class="text-14 leading-none top-0 absolute -translate-x-1"
            [ngClass]="{ '-translate-x-2': $last }"
            [ngStyle]="{ left: ($index / ($count - 1)) * 100 + '%' }"
          >
            {{ marker }}
          </p>
        }
      </div>
    }

    <div class="relative h-3 w-full" (click)="onBarClick($event)">
      <div
        class="absolute block w-full h-1 bg-gray-400 top-1 bottom-1 rounded shadow overflow-hidden"
      >
        <span
          class="block relative bg-gradient-to-r from-blue-500 to-blue-300 h-full"
          [ngStyle]="
            range
              ? {
                  left: offset != null ? offset + '%' : handleValues[0] + '%',
                  width: diff
                    ? diff + '%'
                    : handleValues[1] - handleValues[0] + '%'
                }
              : { width: handleValue + '%' }
          "
        ></span>
      </div>
      @if (range) {
        <span
          #sliderHandleStart
          class="absolute cursor-grab block w-3 h-3 -translate-x-1.5 rounded-sm bg-gray-50 hover:bg-gray-300 transition-colors"
          [style.transition]="dragging ? 'none' : null"
          [ngStyle]="{ left: rangeStartLeft }"
          [ngClass]="{ 'handle--active': handleIndex === 0 }"
          (mousedown)="onMouseDown($event, 0)"
          (touchstart)="onDragStart($event, 0)"
          (touchmove)="onDrag($event)"
          (touchend)="onDragEnd($event)"
          role="slider"
          [attr.tabindex]="disabled ? null : tabindex"
          [attr.aria-valuemin]="min"
          [attr.aria-valuenow]="value ? value[0] : null"
          [attr.aria-valuemax]="max"
          [attr.aria-labelledby]="ariaLabelledBy"
          [attr.aria-label]="ariaLabel"
        ></span>
        <span
          #sliderHandleEnd
          class="absolute cursor-grab block w-3 h-3 -translate-x-1.5 rounded-sm bg-gray-50 hover:bg-gray-300 transition-colors"
          [style.transition]="dragging ? 'none' : null"
          [ngStyle]="{ left: rangeEndLeft }"
          [ngClass]="{ 'handle--active': handleIndex === 1 }"
          (mousedown)="onMouseDown($event, 1)"
          (touchstart)="onDragStart($event, 1)"
          (touchmove)="onDrag($event)"
          (touchend)="onDragEnd($event)"
          [attr.tabindex]="disabled ? null : tabindex"
          [attr.aria-valuemin]="min"
          [attr.aria-valuenow]="value ? value[1] : null"
          [attr.aria-valuemax]="max"
          [attr.aria-labelledby]="ariaLabelledBy"
          [attr.aria-label]="ariaLabel"
        ></span>
      } @else {
        <span
          #sliderHandle
          class="absolute cursor-grab block w-3 h-3 -translate-x-1.5 rounded-sm bg-gray-50 hover:bg-gray-300 transition-colors"
          [style.transition]="dragging ? 'none' : null"
          [ngStyle]="{ left: handleValue + '%' }"
          (touchstart)="onDragStart($event)"
          (touchmove)="onDrag($event)"
          (touchend)="onDragEnd($event)"
          (mousedown)="onMouseDown($event)"
          [attr.tabindex]="disabled ? null : tabindex"
          role="slider"
          [attr.aria-valuemin]="min"
          [attr.aria-valuenow]="value"
          [attr.aria-valuemax]="max"
          [attr.aria-labelledby]="ariaLabelledBy"
          [attr.aria-label]="ariaLabel"
        ></span>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding-left: 0.5rem;
        padding-right: 0.5rem;
      }
    `
  ],
  imports: [NgClass, NgStyle],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SliderComponent),
      multi: true
    }
  ]
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderComponent implements OnDestroy, ControlValueAccessor {
  private readonly document = inject<Document>(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly el = inject(ElementRef);
  readonly renderer = inject(Renderer2);
  private readonly ngZone = inject(NgZone);
  readonly cd = inject(ChangeDetectorRef);

  /** When present, it specifies that the element should be disabled */
  @Input() disabled: boolean;

  /**  Mininum boundary value */
  @Input() min = 0;

  /** Maximum boundary value */
  @Input() max = 100;

  /**  Step factor to increment/decrement the value */
  @Input() step: number;

  /**  When specified, allows two boundary values to be picked */
  @Input() range: boolean;

  @Input() markers?: number[];

  /**  Defines a string that labels the input for accessibility */
  @Input() ariaLabel?: string;

  /**  Establishes relationships between the component and label(s) where its value should be one or more element IDs */
  @Input() ariaLabelledBy?: string;

  /** Index of the element in tabbing order */
  @Input() tabindex = 0;

  /** Callback to invoke on value change */
  @Output() sliderChange = new EventEmitter<SliderChangeEvent>();

  /**  Callback to invoke when slide ended */
  @Output() slideEnd = new EventEmitter<SliderSlideEndEvent>();

  @ViewChild('sliderHandle') sliderHandle?: ElementRef | null;
  @ViewChild('sliderHandleStart') sliderHandleStart?: ElementRef | null;
  @ViewChild('sliderHandleEnd') sliderHandleEnd?: ElementRef | null;

  onChange: (value: number[] | number) => void = () => void 0;
  onTouched: () => void = () => void 0;

  protected value?: number | null;
  protected values?: number[] | null;
  protected handleValue?: number | null;
  protected handleValues: number[] = [];
  protected handleIndex = 0;
  protected diff?: number | null;
  protected offset?: number | null;
  protected bottom?: number | null;
  protected dragging?: boolean | null;
  private dragListener?: (() => void) | null;
  private mouseupListener?: (() => void) | null;
  private initX?: number | null;
  private initY?: number | null;
  private barWidth?: number | null;
  private barHeight?: number | null;
  private sliderHandleClick?: boolean | null;
  private startHandleValue: any;
  private startx?: number | null;
  private starty?: number | null;

  onMouseDown(event: Event, index?: number) {
    if (this.disabled) return;

    this.dragging = true;
    this.updateDomData();
    this.sliderHandleClick = true;
    this.handleIndex =
      this.range && this.handleValues?.[0] === this.max ? 0 : index!;

    this.bindDragListeners();
    (event.target as HTMLInputElement).focus();
    event.preventDefault();
  }

  onDragStart(event: TouchEvent, index?: number) {
    if (this.disabled) return;

    const touchobj: any = event.changedTouches[0];
    this.startHandleValue = this.range
      ? this.handleValues[index!]
      : this.handleValue;
    this.dragging = true;
    this.handleIndex =
      this.range && this.handleValues?.[0] === this.max ? 0 : index!;

    this.startx = Number.parseInt(touchobj.clientX, 10);
    this.barWidth = this.el.nativeElement.offsetWidth;

    event.preventDefault();
  }

  onDrag(event: TouchEvent) {
    if (this.disabled) return;

    const touchObj: any = event.changedTouches[0];
    const handleValue =
      Math.floor(
        ((Number.parseInt(touchObj.clientX, 10) - this.startx!) * 100) /
          this.barWidth!
      ) + this.startHandleValue;

    this.setValueFromHandle(event, handleValue);

    event.preventDefault();
  }

  onDragEnd(event: TouchEvent) {
    if (this.disabled) return;

    this.dragging = false;

    if (this.range)
      this.slideEnd.emit({
        originalEvent: event,
        values: this.values!
      });
    else
      this.slideEnd.emit({
        originalEvent: event,
        value: this.value!
      });

    event.preventDefault();
  }

  onBarClick(event: MouseEvent) {
    if (this.disabled) return;

    if (!this.sliderHandleClick) {
      this.updateDomData();
      this.handleChange(event);

      this.slideEnd.emit(
        this.range
          ? { originalEvent: event, values: this.values! }
          : { originalEvent: event, value: this.value! }
      );
    }

    this.sliderHandleClick = false;
  }

  handleChange(event: MouseEvent) {
    const handleValue = this.calculateHandleValue(event);
    this.setValueFromHandle(event, handleValue);
  }

  bindDragListeners() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.runOutsideAngular(() => {
      const documentTarget: any = this.el
        ? this.el.nativeElement.ownerDocument
        : this.document;

      if (!this.dragListener) {
        this.dragListener = this.renderer.listen(
          documentTarget,
          'mousemove',
          (event) => {
            if (this.dragging) {
              this.ngZone.run(() => this.handleChange(event));
            }
          }
        );
      }

      if (!this.mouseupListener) {
        this.mouseupListener = this.renderer.listen(
          documentTarget,
          'mouseup',
          (event) => {
            if (this.dragging) {
              this.dragging = false;
              this.ngZone.run(() =>
                this.slideEnd.emit(
                  this.range
                    ? {
                        originalEvent: event,
                        values: this.values!
                      }
                    : {
                        originalEvent: event,
                        value: this.value!
                      }
                )
              );
            }
          }
        );
      }
    });
  }

  unbindDragListeners() {
    if (this.dragListener) {
      this.dragListener();
      this.dragListener = null;
    }

    if (this.mouseupListener) {
      this.mouseupListener();
      this.mouseupListener = null;
    }
  }

  setValueFromHandle(event: Event, handleValue: any) {
    const newValue = this.getValueFromHandle(handleValue);

    if (this.range) {
      if (this.step) {
        this.handleStepChange(newValue, this.values![this.handleIndex]);
      } else {
        this.handleValues[this.handleIndex] = handleValue;
        this.updateValue(newValue, event);
      }
    } else {
      if (this.step) {
        this.handleStepChange(newValue, this.value!);
      } else {
        this.handleValue = handleValue;
        this.updateValue(newValue, event);
      }
    }

    this.cd.markForCheck();
  }

  handleStepChange(newValue: number, oldValue: number) {
    const diff = newValue - oldValue;
    let val = oldValue;

    if (diff < 0) {
      val =
        oldValue +
        Math.ceil(newValue / this.step! - oldValue / this.step!) * this.step!;
    } else if (diff > 0) {
      val =
        oldValue +
        Math.floor(newValue / this.step! - oldValue / this.step!) * this.step!;
    }

    this.updateValue(val);
    this.updateHandleValue();
  }

  writeValue(value: any): void {
    if (this.range) this.values = value || [0, 0];
    else this.value = value || 0;

    this.updateHandleValue();
    this.updateDiffAndOffset();
    this.cd.markForCheck();
  }

  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(val: boolean): void {
    this.disabled = val;
    this.cd.markForCheck();
  }

  get rangeStartLeft() {
    return this.handleValues[0] > 100 ? 100 + '%' : this.handleValues[0] + '%';
  }

  get rangeEndLeft() {
    return this.handleValues[1] + '%';
  }

  updateDomData(): void {
    const innerBar = this.el.nativeElement;
    const { left, top } = innerBar.getBoundingClientRect();
    this.initX = left + DomHandler.getWindowScrollLeft();
    this.initY = top + DomHandler.getWindowScrollTop();
    this.barWidth = innerBar.offsetWidth;
    this.barHeight = innerBar.offsetHeight;
  }

  calculateHandleValue(event: MouseEvent): number {
    return ((event.pageX - this.initX!) * 100) / this.barWidth!;
  }

  updateHandleValue(): void {
    if (this.range) {
      this.handleValues[0] =
        ((this.values![0] < this.min ? 0 : this.values![0] - this.min) * 100) /
        (this.max - this.min);
      this.handleValues[1] =
        ((this.values![1] > this.max ? 100 : this.values![1] - this.min) *
          100) /
        (this.max - this.min);
    } else {
      if (this.value! < this.min) this.handleValue = 0;
      else if (this.value! > this.max) this.handleValue = 100;
      else
        this.handleValue =
          ((this.value! - this.min) * 100) / (this.max - this.min);
    }

    if (this.step) {
      this.updateDiffAndOffset();
    }
  }

  updateDiffAndOffset(): void {
    this.diff = this.getDiff();
    this.offset = this.getOffset();
  }

  getDiff(): number {
    return Math.abs(this.handleValues[0] - this.handleValues[1]);
  }

  getOffset(): number {
    return Math.min(this.handleValues[0], this.handleValues[1]);
  }

  updateValue(val: number, event?: Event): void {
    if (this.range) {
      let value = val;

      if (this.handleIndex === 0) {
        if (value < this.min) {
          value = this.min;
          this.handleValues[0] = 0;
        } else if (value > this.values![1] && value > this.max) {
          value = this.max;
          this.handleValues[0] = 100;
        }
        this.sliderHandleStart?.nativeElement.focus();
      } else {
        if (value > this.max) {
          value = this.max;
          this.handleValues[1] = 100;
          this.offset = this.handleValues[1];
        } else if (value < this.min) {
          value = this.min;
          this.handleValues[1] = 0;
        } else if (value < this.values![0]) {
          this.offset = this.handleValues[1];
        }
        this.sliderHandleEnd?.nativeElement.focus();
      }

      if (this.step) {
        this.updateHandleValue();
      } else {
        this.updateDiffAndOffset();
      }

      const oldValues = [this.minVal, this.maxVal];
      this.values![this.handleIndex] = this.getNormalizedValue(value);
      const newValues = [this.minVal, this.maxVal];
      // This oldValues != newValues check is a change I added. Otherwise it
      // spews change events when dragging, even if nothing has changed - Tom
      if (
        !this.step ||
        newValues[0] !== oldValues[0] ||
        newValues[1] !== oldValues[1]
      ) {
        this.onChange(newValues);
        this.sliderChange.emit({ event: event!, values: this.values! });
      }
    } else {
      if (val < this.min) {
        val = this.min;
        this.handleValue = 0;
      } else if (val > this.max) {
        val = this.max;
        this.handleValue = 100;
      }

      // Same as above.
      const oldValue = this.value;
      this.value = this.getNormalizedValue(val);
      if (!this.step || oldValue !== this.value) {
        this.onChange(this.value);
        this.sliderChange.emit({ event: event as Event, value: this.value });
      }
      this.sliderHandle?.nativeElement.focus();
    }
    this.updateHandleValue();
  }

  getValueFromHandle(handleValue: number): number {
    return (this.max - this.min) * (handleValue / 100) + this.min;
  }

  getDecimalsCount(value: number): number {
    if (value && Math.floor(value) !== value)
      return value.toString().split('.')[1].length || 0;
    return 0;
  }

  getNormalizedValue(val: number): number {
    const decimalsCount = this.getDecimalsCount(this.step!);
    if (decimalsCount > 0) {
      return +Number.parseFloat(val.toString()).toFixed(decimalsCount);
    } else {
      return Math.floor(val);
    }
  }

  ngOnDestroy() {
    this.unbindDragListeners();
  }

  get minVal() {
    return Math.min(this.values![1], this.values![0]);
  }
  get maxVal() {
    return Math.max(this.values![1], this.values![0]);
  }
}
