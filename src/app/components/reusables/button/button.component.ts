import { CommonModule } from '@angular/common';
import { Component, HostBinding, HostListener, input, ViewEncapsulation } from '@angular/core';

type Palette = 'primary' | 'secondary' | 'accent' | 'danger' | 'success' | 'transparent';

@Component({
  selector: 'button[app-button]',
  standalone: true,
  imports: [CommonModule],
  template: `@if (isLoading()) {
      <div class="spinner"></div>
    } @else {
      <ng-content></ng-content>
    }`,
  styleUrl: './button.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ButtonComponent {
  public color = input<Palette>('primary');

  public disabled = input(false);

  public isLoading = input(false);

  @HostBinding('class')
  public get class(): string {
    const disabled = this.disabled() ? 'app-button-disabled' : '';
    return `app-button ${this.color()}-bg ${this.color()}-bg-hover ${disabled}`;
  }

  @HostBinding('attr.disabled')
  public get attrDisabled(): boolean | null {
    return this.isLoading() || this.disabled() || null;
  }

  @HostListener('click')
  public onClick(event: PointerEvent): void {
    if (this.isLoading()) {
      event.stopPropagation();
      event.preventDefault();
    }
  }
}
