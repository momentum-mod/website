import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'm-spinner',
  standalone: true,
  imports: [NgClass],
  template: '<span [ngClass]="spinnerClass"></span>',
  styles: [
    `
      :host {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        right: 0;
        left: 0;
        bottom: 0;
        display: flex;
        overflow: hidden;
        justify-content: center;
        align-items: center;
        pointer-events: none;

        span {
          border-radius: 50%;
          border: 0.25rem solid theme('colors.gray.200');
          border-bottom-color: transparent;
          height: 48px;
          aspect-ratio: 1/1;
          animation: spin 1s linear infinite;
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `
  ]
})
export class SpinnerComponent {
  @Input() spinnerClass = '';
}
