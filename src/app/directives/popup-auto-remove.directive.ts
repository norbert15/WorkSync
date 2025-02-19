import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  Input,
  input,
  OnDestroy,
  OnInit,
  Renderer2,
} from '@angular/core';
import { PopupService } from '../services/popup.service';

@Directive({
  selector: '[appPopupAutoRemove]',
  standalone: true,
})
export class PopupAutoRemoveDirective implements OnInit, OnDestroy {
  @Input() public set length(length: number) {
    this.startCountdown();
  }

  public popupKey = input.required<string>();

  private timeoutId: any;

  private readonly popupService = inject(PopupService);
  private readonly elementRef = inject(ElementRef);
  private readonly renderer = inject(Renderer2);

  public ngOnInit(): void {
    // Eseményfigyelők az egérmozgásra
    this.renderer.listen(this.elementRef.nativeElement, 'mouseenter', () => this.stopCountdown());
    this.renderer.listen(this.elementRef.nativeElement, 'mouseleave', () => this.startCountdown());
  }

  public ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.timeoutId = setTimeout(() => {
      this.removeElement();
    }, 5000);
  }

  private stopCountdown(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private removeElement(close: boolean = false): void {
    (this.elementRef.nativeElement as HTMLElement).classList.add('slide-out');
    // Kis késleltetés az animáció lefutására
    setTimeout(() => {
      if (!close) {
        this.popupService.timeout(this.popupKey());
      } else {
        this.popupService.close(this.popupKey());
      }
    }, 500);
  }

  @HostListener('click', ['$event'])
  public onClick(event: PointerEvent) {
    const target = event.target as HTMLElement;

    if (target.getAttribute('id') === this.popupKey()) {
      this.removeElement(false); // True-ra kell állítani ha szükségessé válik a callback;
    }
  }
}
