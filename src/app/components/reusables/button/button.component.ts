import { Component, computed, HostBinding, HostListener, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

type Palette = 'primary' | 'secondary' | 'accent' | 'danger' | 'success' | 'transparent';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `<button (click)="onHandleClick($event)" [ngClass]="getClasses()" [type]="type()">
    @if (isLoading()) {
      <div class="spinner"></div>
    } @else {
      <ng-content></ng-content>
    }
  </button>`,
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  /**
   * A gomb színe
   */
  public color = input<Palette>('primary');

  /**
   * A gomb letiltása
   */
  public disabled = input(false);

  /**
   * A gomb osztályai
   */
  public classes = input<string[]>([]);

  /**
   * A gomb típusa
   */
  public type = input<'button' | 'submit' | 'reset'>('button');

  /**
   * A gomb elindított-e egy API hívást, vagy várnia kell egy válaszra
   */
  public isLoading = input(false);

  /**
   * A gombra kattintás eseménye
   */
  public onClick = output<MouseEvent>();

  /**
   * A gombra kattintás eseményének kezelése
   */
  public onHandleClick(event: MouseEvent): void {
    if (this.disabled() || this.isLoading()) {
      return;
    }

    this.onClick.emit(event);
  }

  /**
   * A gomb osztályainak beállítása
   */
  public getClasses = computed<string[]>(() => {
    const color = this.color();
    const disabled = this.disabled();
    const isLoading = this.isLoading();

    const classes: string[] = ['app-button', `${color}-bg`, `${color}-bg-hover`, ...this.classes()];

    if (disabled || isLoading) {
      classes.push('app-button--disabled');
    }

    return classes;
  });

  @HostBinding('attr.disabled')
  public get attrDisabled(): boolean | null {
    return this.isLoading() || this.disabled() || null;
  }

  @HostListener('click')
  public onClicks(event: PointerEvent): void {
    if (this.isLoading() || this.disabled()) {
      event.stopPropagation();
      event.preventDefault();
    }
  }
}
