import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, ReplaySubject, switchMap, take, takeUntil } from 'rxjs';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  CdkDragHandle,
  moveItemInArray,
  transferArrayItem,
  CdkDragPlaceholder,
} from '@angular/cdk/drag-drop';

import { ButtonComponent } from '../../reusables/button/button.component';
import { FadeDirective } from '../../../directives/fade.directive';
import { PopupService } from '../../../services/popup.service';
import { BranchFirebaseService } from '../../../services/firebase/branch-firebase.service';
import { IBranch, IRepository } from '../../../models/branch.model';
import { DialogModel } from '../../../models/dialog.model';
import { DialogsService } from '../../../services/dialogs.service';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    FadeDirective,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
  ],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.scss',
})
export class BranchesComponent implements OnInit, OnDestroy {
  public repositories = signal<Array<IRepository>>([]);
  public activePublications = computed<Array<IRepository>>(() => {
    const repositories = this.repositories();
    const branches = this.activeBranches();
    return repositories.map((repo) => {
      const repoBranches = branches.filter((b) => repo.id === b.repositoryId);
      return {
        branches: repoBranches,
        id: repo.id,
        name: repo.name,
        lastUpdated: repoBranches.length ? repoBranches[repoBranches.length - 1].created : '-',
      };
    });
  });
  public awatingForPublications = computed<Array<IRepository>>(() => {
    const repositories = this.repositories();
    const branches = this.branchFirebaseService.branchesForPublications();

    return repositories.map((repo) => {
      const repoBranches = branches.filter((b) => repo.id === b.repositoryId);
      return {
        branches: repoBranches,
        id: repo.id,
        name: repo.name,
        lastUpdated: repoBranches.length ? repoBranches[repoBranches.length - 1].created : '-',
      };
    });
  });

  public repositoryItemDragged = signal('');

  private activeBranches = signal<Array<IBranch>>([]);

  private readonly destroyed$ = new ReplaySubject<void>(1);

  private readonly poopupService = inject(PopupService);
  private readonly branchFirebaseService = inject(BranchFirebaseService);
  private readonly dialogService = inject(DialogsService);

  public ngOnInit(): void {
    this.fethcActivePublications();
    this.fetchRepositories();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public branchDropped(
    dragEvent: CdkDragDrop<Array<IBranch>>,
    repositoryId: string,
    type: 'publish' | 'active' = 'publish',
  ): void {
    const branch: IBranch = dragEvent.item.data;

    if (branch.repositoryId === repositoryId) {
      const includedBranches: Array<IBranch> = dragEvent.container.data;
      const isAlreadyIn = includedBranches.find((ib) => ib.name === branch.name);

      if (!isAlreadyIn) {
        this.poopupService.add({
          details: 'Branch felvétele folyamataban...',
          severity: 'info',
        });
        this.branchFirebaseService
          .addBranch(branch, type)
          .pipe(take(1))
          .subscribe({
            next: () => {
              this.poopupService.add({
                details: 'A branch hozzáadása sikeresen megtörtént.',
                severity: 'success',
                title: 'Sikeres művelet!',
              });
            },
            error: () => {
              this.poopupService.add({
                details: 'A branch hozzáadása során hiba történt.',
                severity: 'error',
                title: 'Sikertelen művelet!',
              });
            },
          });
      } else {
        this.poopupService.add({
          details: `A "${branch.name}" branch már hozzáadásra került egyszer.`,
          severity: 'warning',
        });
      }
    }
  }

  public onOpenDeleteWarningDialogClick(branch: IBranch, type: 'active' | 'publish'): void {
    const newDialog: DialogModel = new DialogModel('Figyelmeztetés', {
      isDelete: true,
      deleteMessage: `<span>Biztos abban, hogy eltávolitja a(z) <span class="label-primary">"${branch.name}"</span> nevű branch-et?</span>`,
    });
    this.dialogService.addNewDialog(newDialog);
    newDialog.delete$
      .pipe(
        take(1),
        switchMap(() => {
          this.poopupService.add({
            details: `A "${branch.name}" eltávolítása folyamatban...`,
            severity: 'info',
            title: branch.repositoryId,
          });

          return this.branchFirebaseService.deleteBranch(branch.id, type);
        }),
        finalize(() => {
          this.dialogService.removeLastOpenedDialog();
        }),
      )
      .subscribe({
        next: () => {
          this.poopupService.add({
            details: `A "${branch.name}" eltávolítása sikeresen megtörtént`,
            severity: 'success',
            title: branch.repositoryId,
          });
        },
        error: () => {
          this.poopupService.add({
            details: `A "${branch.name}" eltávolítása során hiba történt`,
            severity: 'error',
            title: branch.repositoryId,
          });
        },
      });
  }

  public async onCopyBranchNameClick(branchName: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(branchName);
      this.poopupService.add({
        details: 'A szöveg másolása megtörtént.',
        severity: 'success',
      });
    } catch (err) {
      this.poopupService.add({
        details: 'Hiba: ' + err,
        severity: 'error',
        title: 'A szöveg másolása nem sikerült',
      });
    }
  }

  private fethcActivePublications(): void {
    this.branchFirebaseService
      .getBranches('active')
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (branches: Array<IBranch>) => {
          this.activeBranches.set(branches);
        },
      });
  }

  private fetchRepositories(): void {
    this.branchFirebaseService
      .getRepositories()
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (repositories: Array<IRepository>) => {
          this.repositories.set(repositories);
        },
      });
  }
}
