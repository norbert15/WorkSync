import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  Renderer2,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReplaySubject, takeUntil } from 'rxjs';

import { DialogsService } from '../../../services/dialogs.service';
import { FadeDirective } from '../../../directives/fade.directive';
import { ButtonComponent } from '../../../components/reusables/button/button.component';
import { DialogModel } from '../../../models/dialog.model';

@Component({
  selector: 'app-dialogs',
  standalone: true,
  imports: [CommonModule, FadeDirective, ButtonComponent],
  templateUrl: './dialogs.component.html',
  styleUrl: './dialogs.component.scss',
})
export class DialogsComponent implements OnInit, OnDestroy {
  public defaultContentTemplate = viewChild<TemplateRef<any>>('defaultContentTemplate');
  public defaultFooterTemplate = viewChild<TemplateRef<any>>('defaultFooterTemplate');

  public dialog = signal<DialogModel | null>(null);

  private unlisten: (() => void) | null = null;

  private readonly destroyed$ = new ReplaySubject<void>(1);
  private readonly dialogsService = inject(DialogsService);
  private readonly renderer = inject(Renderer2);

  public ngOnInit(): void {
    this.fetchLastOpenedDialog();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
    this.dialogsService.clearAll();
  }

  public onCloseClick(): void {
    this.dialogsService.removeLastOpenedDialog();
  }

  public onTriggerClick(): void {
    this.dialog.update((dialog) => {
      dialog!.triggerIsLoading.set(true);
      return dialog;
    });
    this.dialog()!.trigger();
  }

  private fetchLastOpenedDialog(): void {
    this.dialogsService.dialogs$.pipe(takeUntil(this.destroyed$)).subscribe({
      next: (dialogs: Array<DialogModel>) => {
        const dialog = dialogs[dialogs.length - 1] || null;

        if (dialog) {
          // Ha már van template átadva akkor azt nem írjuk felül
          if (!dialog.content) {
            dialog.content = this.defaultContentTemplate();
          }

          // Ha már van template átadva akkor azt nem írjuk felül
          if (!dialog.footer) {
            dialog.footer = this.defaultFooterTemplate();
          }
        }

        this.dialog.set(dialog);

        if (this.dialog() && !this.unlisten) {
          this.unlisten = this.renderer.listen('document', 'keydown.escape', () => {
            this.dialogsService.removeLastOpenedDialog();
          });
        }

        if (!this.dialog() && this.unlisten) {
          this.unlisten();
          this.unlisten = null;
        }
      },
    });
  }
}
