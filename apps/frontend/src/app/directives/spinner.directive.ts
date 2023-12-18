import {
  ComponentRef,
  Directive,
  ElementRef,
  OnInit,
  Renderer2,
  ViewContainerRef,
  HostBinding,
  Input
} from '@angular/core';
import { SpinnerComponent } from '../components/spinner/spinner.component';

// Based off of Nebular directive
// https://github.com/akveo/nebular/blob/master/src/framework/theme/components/spinner/spinner.directive.ts
@Directive({ selector: '[mSpinner]', standalone: true })
export class SpinnerDirective implements OnInit {
  spinner: ComponentRef<SpinnerComponent>;

  @Input()
  set mSpinner(val: boolean) {
    val ? this.show() : this.hide();
  }

  @HostBinding('class.m-spinner-container--active')
  protected active = false;

  constructor(
    private vcRef: ViewContainerRef,
    private renderer: Renderer2,
    private directiveElement: ElementRef
  ) {}

  ngOnInit() {
    this.spinner = this.vcRef.createComponent(SpinnerComponent);
    this.spinner.changeDetectorRef.detectChanges();
    this.renderer.appendChild(
      this.directiveElement.nativeElement,
      this.spinner.location.nativeElement
    );
    this.renderer.addClass(
      this.directiveElement.nativeElement,
      'm-spinner-container'
    );
  }

  hide() {
    this.active = false;
  }

  show() {
    this.active = true;
  }
}
