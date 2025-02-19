import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PopupService, PopupType } from '../../../services/popup.service';
import { PopupAutoRemoveDirective } from '../../../directives/popup-auto-remove.directive';

type GroupedPopups = {
  length: number;
  key: string;
} & Pick<PopupType, 'title' | 'severity' | 'details'>;

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [CommonModule, PopupAutoRemoveDirective],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.scss',
})
export class PopupComponent {
  public readonly ICONS: Record<string, string> = {
    error: 'bi bi-ban',
    warning: 'bi bi-exclamation-circle',
    success: 'bi bi-check-circle',
    info: 'bi bi-info-circle',
    close: 'bi bi-x-circle',
  };

  public groupedPopups = computed<Array<GroupedPopups>>(() => {
    const popupGroups = this.popupService.popupGroups();
    const groupedPopups: Array<GroupedPopups> = [];

    Object.keys(popupGroups).forEach((key) => {
      const popups = popupGroups[key];
      const popup = popups[0];
      groupedPopups.push({
        key: key,
        length: popups.length,
        details: popup.details,
        severity: popup.severity,
        title: popup.title,
      });
    });

    return groupedPopups;
  });

  private readonly popupService = inject(PopupService);
}
