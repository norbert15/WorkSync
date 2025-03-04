import {
  Component,
  computed,
  ElementRef,
  HostListener,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

import {
  ITableRow,
  ITableTitle,
  TableCellConfigType,
  TableCellOperationType,
} from '../../../models/table.model';
import { IconIds, TableOperationEnum } from '../../../core/constans/enums';

type ActiveSorType = { index: number; lowToHigh: boolean };

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, NgTemplateOutlet, MatIcon],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
})
export class TableComponent implements OnInit {
  public tableContainer = viewChild<ElementRef<HTMLDivElement>>('tableContainer');

  public titles = input<ITableTitle[]>([]);

  public rows = input<ITableRow[]>([]);

  public minWidth = input<string>();

  public autoHeight = input<boolean>(false);

  /**
   * Ha nincs megjelenítedő sor
   */
  public emptyPlaceholder = input('Nincs mit megjeleníteni.');

  /**
   * Ha nem található a szürési feltételeknek sor
   */
  public notFoundPlaceholder = input('Nem található a szürésnek megfelelő sorok!');

  public cellClick = output<TableCellConfigType>();
  public rowClick = output<ITableRow>();
  public operationClick = output<{ row: ITableRow; operationName: TableOperationEnum }>();

  public readonly OPERATIONS: Record<TableOperationEnum | any, { icon: IconIds; class: string }> = {
    [TableOperationEnum.DELETE]: { icon: IconIds.TRASH, class: 'label-danger' },
    [TableOperationEnum.EDIT]: { icon: IconIds.PENCIL_SQUARE, class: 'label-primary' },
    [TableOperationEnum.CANCEL]: { icon: IconIds.X_CIRCLE, class: 'label-danger' },
    [TableOperationEnum.CHECK]: { icon: IconIds.CHECK_CIRCLE, class: 'label-success' },
    [TableOperationEnum.SEE]: { icon: IconIds.EYE, class: 'label-secondary' },
  };

  public displayedRows = computed(() => {
    const rows = this.rows().slice();
    const titles = this.titles();
    const activeSort = this.activeSort();

    if (activeSort) {
      const { compareFn, orderBy } = titles[activeSort.index];

      return rows.sort((currentRow, nextRow) => {
        if (compareFn) {
          return compareFn(currentRow, nextRow, activeSort.lowToHigh);
        }

        const currentItem =
          currentRow.cells[orderBy ?? '']?.value ??
          this.makeIterable(currentRow.cells)[activeSort.index]?.value ??
          '';
        const nextItem =
          nextRow.cells[orderBy ?? '']?.value ??
          this.makeIterable(nextRow.cells)[activeSort.index]?.value ??
          '';

        if (typeof currentItem === 'number' && typeof nextItem === 'number') {
          return activeSort.lowToHigh ? currentItem - nextItem : nextItem - currentItem;
        }

        if (typeof currentItem === 'string' && typeof nextItem === 'string') {
          return activeSort.lowToHigh
            ? currentItem.localeCompare(nextItem)
            : nextItem.localeCompare(currentItem);
        }

        return 0;
      });
    }

    return rows;
  });

  public activeSort = signal<ActiveSorType | null>(null);

  public ngOnInit(): void {
    this.onResize();
  }

  public makeIterable = (object: object) => Object.values(object ?? {});

  public onCellClick(row: ITableRow, cell: TableCellConfigType): void {
    if (cell.triggerOnClick) {
      cell.triggerOnClick(cell);
    } else {
      this.cellClick.emit(cell);
      this.rowClick.emit(row);
    }
  }

  public onOperationClick(row: ITableRow, operation: TableCellOperationType): void {
    if (operation.triggerFn) {
      operation.triggerFn(row);
    } else {
      this.operationClick.emit({ row, operationName: operation.name! });
    }
  }

  public onSetActiveSortingClick(index: number, lowToHigh: boolean): void {
    this.activeSort.set({ index, lowToHigh });
  }

  @HostListener('window:resize')
  public onResize(): void {
    const container = this.tableContainer()?.nativeElement;
    if (this.autoHeight() && container) {
      container.style.maxHeight = `${window.innerHeight - container.offsetTop - 20}px`;
    }
  }
}
