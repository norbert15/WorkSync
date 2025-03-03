import { TemplateRef } from '@angular/core';
import { TableOperationEnum } from '../core/constans/enums';

export type TableCellOperationType = {
  name?: TableOperationEnum;
  triggerFn?: (row: ITableRow) => void;
  tooltip?: string;
  templateRef?: TemplateRef<any>;
};

export type TableCellConfigType = {
  class?: string;
  value?: string | number | boolean;
  templateRef?: TemplateRef<any>;
  truncate?: boolean;
  operations?: TableCellOperationType[];
  triggerOnClick?: (cell: TableCellConfigType) => void;
  item?: any;
};

export interface ITableRow<T = any> {
  cells: Record<string, TableCellConfigType>;
  model?: T;
  checked?: boolean;
}

export interface ITableTitle<T = any> {
  text: string;
  order?: boolean;
  orderBy?: string;
  class?: string;
  compareFn?: (currentRow: ITableRow<T>, nextRow: ITableRow<T>, lowToHigh?: boolean) => number;
}
