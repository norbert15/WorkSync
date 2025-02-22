import { AfterViewInit, Directive, ElementRef, inject, Input } from '@angular/core';

@Directive({
  selector: '[appScrollToBottom]',
  standalone: true,
})
export class ScrollToBottomDirective implements AfterViewInit {
  @Input() public set items(items: any) {
    this.scrollToBottom();
  }

  private readonly el = inject(ElementRef);

  public ngAfterViewInit() {
    setTimeout(() => {
      this.scrollToBottom();
    }, 500);
  }

  private scrollToBottom(): void {
    const element: HTMLElement = this.el.nativeElement;
    element.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
