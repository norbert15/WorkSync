import { AfterViewInit, Directive, HostBinding, signal } from '@angular/core';

@Directive({
  selector: '[appFade]',
  standalone: true,
})
export class FadeDirective implements AfterViewInit {
  private show = signal(false);

  public ngAfterViewInit(): void {
    setTimeout(() => {
      this.show.set(true);
    }, 10);
  }

  @HostBinding('class.transition')
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  public get transition(): boolean {
    return true;
  }

  @HostBinding('class.hidden')
  public get hidden(): boolean {
    return !this.show();
  }
}
