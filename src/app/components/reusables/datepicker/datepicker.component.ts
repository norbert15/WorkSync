import {
  Component,
  computed,
  ElementRef,
  HostListener,
  model,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { HUN_MONTHS } from '../../../core/constans/variables';
import { IconIds } from '../../../core/constans/enums';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-datepicker',
  standalone: true,
  imports: [CommonModule, MatIcon],
  templateUrl: './datepicker.component.html',
  styleUrl: './datepicker.component.scss',
})
export class DatepickerComponent implements OnInit {
  public readonly CHEVRON_LEFT_ICON = IconIds.CHEVRON_LEFT;
  public readonly HUN_MONTHS = HUN_MONTHS;

  public readonly TODAY = new Date();

  public readonly COLUMNS = 3;
  public readonly ROWS = 4;

  public readonly MAX_YEAR = this.TODAY.getFullYear() + 2;

  public datePicker = viewChild<ElementRef<HTMLDivElement>>('datePicker');

  public year = model<number>();
  public month = model<number>();

  public valuesChange = output<Array<number>>();

  public menu = signal<'year' | 'month'>('year');

  public years = signal<Array<number>>(Array.from({ length: 50 }).map((_, i) => this.MAX_YEAR - i));
  public page = signal<number>(1);
  public maxPage = computed(() => Math.ceil(this.years().length / (this.COLUMNS * this.ROWS)));

  public showOptions = signal(false);

  public ngOnInit(): void {
    if (!this.year()) {
      this.year.set(this.TODAY.getFullYear());
    }

    if (!this.month()) {
      this.month.set(this.TODAY.getMonth() + 1);
    }

    this.valuesChange.emit([this.year()!, this.month()!]);
  }

  public onMonthSelect(month: number): void {
    this.month.set(month);
    this.valuesChange.emit([this.year()!, this.month()!]);
    this.menu.set('year');
  }

  public onYearSelect(year: number): void {
    this.year.set(year);
    this.valuesChange.emit([this.year()!, this.month()!]);
    this.menu.set('month');
  }

  public handlePageChange(value: 1 | -1): void {
    if (value !== -1 && value !== 1) {
      return;
    }

    const result = this.page() + value;

    if (result < 1 || result > this.maxPage()) {
      return;
    }

    this.page.set(this.page() + value);
  }

  public onTodayClick(): void {
    this.year.set(this.TODAY.getFullYear());
    this.month.set(this.TODAY.getMonth() + 1);
    this.page.set(1);

    this.valuesChange.emit([this.year()!, this.month()!]);
  }

  public toggleOptions(): void {
    this.showOptions.set(!this.showOptions());
  }

  @HostListener('document:click', ['$event'])
  public documentClick(event: PointerEvent): void {
    const target = event.target as HTMLElement;

    if (!this.datePicker() || !this.datePicker()?.nativeElement.contains(target)) {
      this.showOptions.set(false);
    }
  }
}
