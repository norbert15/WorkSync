import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  CdkDragHandle,
} from '@angular/cdk/drag-drop';
import { finalize, Observable, ReplaySubject, switchMap, take, takeUntil } from 'rxjs';

import { ButtonComponent } from '../../reusables/button/button.component';
import { FadeDirective } from '../../../directives/fade.directive';
import { PopupService } from '../../../services/popup.service';
import { PublicationFirebaseService } from '../../../services/firebase/publication-firebase.service';
import { IBranch, IRepository } from '../../../models/branch.model';
import { DialogModel } from '../../../models/dialog.model';
import { DialogsService } from '../../../services/dialogs.service';
import { RepositroyEnum } from '../../../core/constans/enums';
import { RepositoryCommentsComponent } from './repository-comments/repository-comments.component';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { IUser } from '../../../models/user.model';

type BranchWithCheckType = { checked: boolean } & IBranch;

@Component({
  selector: 'app-publications',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    FadeDirective,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    FormsModule,
    RepositoryCommentsComponent,
    AsyncPipe,
  ],
  templateUrl: './publications.component.html',
  styleUrl: './publications.component.scss',
})
export class PublicationsComponent implements OnInit, OnDestroy {
  public publicationsDialogTemplate = viewChild<TemplateRef<any>>('publicationsDialogTemplate');
  public publicationsButtonsDialogTemplate = viewChild<TemplateRef<any>>(
    'publicationsButtonsDialogTemplate',
  );

  public readonly ACTIVE = RepositroyEnum.ACTIVE;

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
        comments: repo.comments,
        lastUpdated: repoBranches.length ? repoBranches[0].created : '-',
      };
    });
  });

  public awatingForPublications = computed<Array<IRepository>>(() => {
    const repositories = this.repositories();
    const branches = this.publicationFirebaseService.branchesForPublications();

    return repositories.map((repo) => {
      const repoBranches = branches.filter((b) => repo.id === b.repositoryId);
      return {
        branches: repoBranches,
        id: repo.id,
        name: repo.name,
        comments: repo.comments,
        lastUpdated: repoBranches.length ? repoBranches[repoBranches.length - 1].created : '-',
      };
    });
  });

  public repositoryItemDragged = signal('');

  public selectedBranches = signal<Array<BranchWithCheckType>>([]);

  public publishMarkBtnIsLoading = signal(false);

  public user$!: Observable<IUser | null>;

  private activeBranches = signal<Array<IBranch>>([]);

  private readonly destroyed$ = new ReplaySubject<void>(1);

  private readonly poopupService = inject(PopupService);
  private readonly publicationFirebaseService = inject(PublicationFirebaseService);
  private readonly dialogService = inject(DialogsService);
  private readonly userFirebaseService = inject(UserFirebaseService);

  public ngOnInit(): void {
    this.user$ = this.userFirebaseService.user$.asObservable();
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
    type: RepositroyEnum = RepositroyEnum.PUBLISH,
  ): void {
    const branch: IBranch = dragEvent.item.data;

    if (branch.repositoryId === repositoryId) {
      const includedBranches: Array<IBranch> = dragEvent.container.data;
      const isAlreadyIn = includedBranches.find((ib) => ib.name === branch.name);

      if (!isAlreadyIn) {
        this.addBranch(branch, type);
      } else {
        this.updateBranch(isAlreadyIn, type);
      }
    }
  }

  public onCloseDialogClick(): void {
    this.dialogService.removeLastOpenedDialog();
  }

  public onMarkAsPublishedClick(): void {
    const checkedBranches = this.selectedBranches().filter((b) => b.checked);

    if (checkedBranches.length) {
      const activeBranches = this.activePublications().find(
        (repo) => repo.id === checkedBranches[0].repositoryId,
      )!.branches;
      this.publishMarkBtnIsLoading.set(true);
      this.poopupService.add({
        details: 'A branch-ek módosítása folyamatban...',
        severity: 'info',
      });
      this.publicationFirebaseService
        .updateActiveAndPublicationBranches(checkedBranches, activeBranches)
        .pipe(
          take(1),
          finalize(() => {
            this.publishMarkBtnIsLoading.set(false);
          }),
        )
        .subscribe({
          next: () => {
            this.dialogService.removeLastOpenedDialog();
            this.poopupService.add({
              details: 'A branch-ek megjelölve publikáltként',
              severity: 'success',
              title: 'Publikálva',
            });
          },
          error: () => {
            this.poopupService.add({
              details: 'A branch-ek megjelölése során hiba történt',
              severity: 'error',
            });
          },
        });
    } else {
      this.poopupService.add({
        details: 'Legalább egy branch-et ki kell választani.',
        severity: 'warning',
      });
    }
  }

  public onOpenMarkBranchesDialogClick(repository: IRepository): void {
    this.selectedBranches.set(
      repository.branches.map((b) => ({
        checked: true,
        created: b.created,
        id: b.id,
        name: b.name,
        repositoryId: b.repositoryId,
        status: b.status,
      })),
    );
    const newDialog: DialogModel = new DialogModel(repository.name, {
      content: this.publicationsDialogTemplate(),
      footer: this.publicationsButtonsDialogTemplate(),
    });
    this.dialogService.addNewDialog(newDialog);
    newDialog.afterComplete$.pipe(take(1)).subscribe({
      next: () => {
        this.selectedBranches.set([]);
      },
    });
  }

  public onOpenDeleteWarningDialogClick(branch: IBranch, type: RepositroyEnum): void {
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

          return this.publicationFirebaseService.deleteBranch(branch.id, type);
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
    this.publicationFirebaseService
      .getBranches(RepositroyEnum.ACTIVE)
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (branches: Array<IBranch>) => {
          this.activeBranches.set(branches.sort((a, b) => b.created.localeCompare(a.created)));
        },
      });
  }

  private fetchRepositories(): void {
    this.publicationFirebaseService
      .getRepositories()
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (repositories: Array<IRepository>) => {
          this.repositories.set(repositories);
        },
      });
  }

  private updateBranch(branch: IBranch, type: RepositroyEnum): void {
    this.poopupService.add({
      details: 'Branch frissitése folyamataban...',
      severity: 'info',
    });
    this.publicationFirebaseService
      .updateBranch(branch, type)
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
  }

  private addBranch(branch: IBranch, type: RepositroyEnum): void {
    this.poopupService.add({
      details: 'Branch felvétele folyamataban...',
      severity: 'info',
    });
    this.publicationFirebaseService
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
  }
}
