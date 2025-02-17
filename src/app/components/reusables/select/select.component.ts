import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface IOption<T = any> {
  label: string;
  value?: T;
  selected?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent<T> implements ControlValueAccessor {
  public label = input('');

  public options = input<Array<IOption<T>>>([]);

  public bootstrapIcon = input('');

  public filterable = input(false);

  public multi = input(false);

  public disabled = model(false);

  public selectedValue = model<T | null>(null);

  public selectEvent = output<T | null>();
  public selectedValuesChange = output<Array<IOption<T>>>();

  public focused = signal(false);

  public opened = signal(false);

  public selectedOptions = signal<Array<IOption>>([]);

  public onChange: any = () => {};

  public selectedOption = computed<IOption | undefined>(() => {
    const options = this.options();
    const value = this.selectedValue();

    return options.find((o) => o.value === value || o.label === value);
  });

  private readonly elementRef = inject(ElementRef);

  public toggleOpened(): void {
    this.opened.set(this.disabled() || !this.opened());
  }

  public onOptionSelect(option: IOption<T>): void {
    if (this.disabled()) {
      return;
    }

    if (this.multi()) {
      const selectedIndex = this.selectedOptions().findIndex((a) => a.label === option.label);

      if (selectedIndex === -1) {
        option.selected = true;
        this.selectedOptions.set([...this.selectedOptions(), option]);
      } else {
        option.selected = false;
        this.selectedOptions().splice(selectedIndex, 1);
        this.selectedOptions.set(this.selectedOptions());
      }
      this.selectedValuesChange.emit(this.selectedOptions());
      this.onChange(this.selectedOptions().map((sc) => sc.value ?? sc.label));
    } else {
      this.selectedValue.set(option.value ?? (option.label as any));
      this.selectEvent.emit(this.selectedValue());
      this.onChange(this.selectedValue());
      this.toggleOpened();
    }
  }

  public writeValue(value: T): void {
    this.selectedValue.set(value);
  }

  public registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  public registerOnTouched(_: any): void {}

  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    const select = this.elementRef.nativeElement as HTMLElement;

    if (!select.contains(target)) {
      this.opened.set(false);
    }
  }
}
