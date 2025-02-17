import { Directive, ElementRef, HostListener, inject } from '@angular/core';

@Directive({
  selector: '[appDragScroll]',
  standalone: true,
})
export class DragScrollDirective {
  private isDragging = false;
  private startX = 0;
  private scrollLeft = 0;

  private readonly el = inject(ElementRef);

  @HostListener('mousedown', ['$event'])
  public onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isDragging = true;
      this.startX = event.pageX - this.el.nativeElement.offsetLeft;
      this.scrollLeft = this.el.nativeElement.scrollLeft;
      this.el.nativeElement.style.cursor = 'grabbing';
    }
  }

  @HostListener('mousemove', ['$event'])
  public onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      event.preventDefault();
      const x = event.pageX - this.el.nativeElement.offsetLeft;
      const walk = (x - this.startX) * 2;
      this.el.nativeElement.scrollLeft = this.scrollLeft - walk;
    }
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  public onMouseUp(): void {
    this.isDragging = false;
    this.el.nativeElement.style.cursor = 'grab';
  }
}
