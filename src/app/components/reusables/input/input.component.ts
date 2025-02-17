import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

type InputType = 'text' | 'number' | 'password' | 'file' | 'date' | 'datetime-local';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  /**
   * A beviteli mező referenciája
   */
  public inputField = viewChild<ElementRef<HTMLInputElement>>('inputField');

  /**
   * @Input A beviteli mező címkéje
   */
  public label = input('');

  /**
   * @Input A beviteli mező típusa
   */
  public type = input<InputType>('text');

  /**
   * @Input A beviteli mező azonosítója
   */
  public id = input<string | null>(null);

  public bootstrapIcon = input<string | null>(null);

  public autocompleteName = input<string | null>(null);

  /**
   * @Input A beviteli mező engedélyezett-e
   */
  public disabled = model(false);

  /**
   * @Output A beviteli mező értékének változása
   */
  public valueChange = output<string>();

  /**
   * @Output A beviteli mező értékének változása
   */
  public nativeChange = output<string>();

  public value = model('');

  public focused = signal(false);

  /**
   * A jelszó mező látható-e
   */
  public passwordVisible = signal(false);

  public onChange: any = () => {};

  public handleInput(): void {
    this.onChange(this.value());
    this.valueChange.emit(this.value());
  }

  public writeValue(value: any): void {
    this.value.set(value);
  }

  public registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  public registerOnTouched(_: any): void {}

  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
