import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, ReplaySubject, takeUntil } from 'rxjs';

export interface ISubmenuItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-submenu-strip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './submenu-strip.component.html',
  styleUrl: './submenu-strip.component.scss',
})
export class SubmenuStripComponent implements OnInit, OnDestroy {
  public menus = input<Array<ISubmenuItem>>([]);

  public emitterMode = input(false);

  public selectedMenu = model('');

  public activeMenu = computed<string>(() => {
    const menus = this.menus();
    const selected = this.selectedMenu();

    let active = selected;

    if (menus.length && !active) {
      active = menus[0].route;
    }

    this.menuChange.emit(active);
    return active;
  });

  public menuChange = output<string>();

  private readonly destroyed$ = new ReplaySubject<void>(1);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    if (!this.emitterMode()) {
      const newRoute = this.menus().find((m) => this.router.url.startsWith(m.route))?.route;
      if (newRoute && !this.selectedMenu()) {
        this.selectedMenu.set(newRoute);
      }

      this.router.events
        .pipe(
          takeUntil(this.destroyed$),
          filter((event) => event instanceof NavigationEnd),
        )
        .subscribe({
          next: (event) => {
            const newRoute = this.menus().find((m) => event.url.startsWith(m.route))?.route;

            if (newRoute) {
              this.selectedMenu.set(newRoute);
            }
          },
        });
    }
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public onMenuChange(route: string): void {
    this.menuChange.emit(route);
    this.selectedMenu.set(route);
  }
}
