import { Component, forwardRef, input, model, output, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-switch-button',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './switch-button.component.html',
  styleUrl: './switch-button.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SwitchButtonComponent),
      multi: true,
    },
  ],
})
export class SwitchButtonComponent implements ControlValueAccessor {
  public left = input(false);

  public label = input('');

  public disabled = model(false);

  public valueChange = output<boolean>();

  public value = signal(false);

  public onChange: any = () => {};

  public handleValueChange(): void {
    this.onChange(this.value());
    this.valueChange.emit(this.value());
  }

  public writeValue(value: boolean): void {
    this.value.set(value);
  }

  public registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  public registerOnTouched(): void {}

  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
