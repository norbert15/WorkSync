import { Routes } from '@angular/router';
import { APP_PATHS } from '../../constans/paths';

export const USER_LAYOUT_ROUTES: Routes = [
  {
    path: APP_PATHS.calendar,
    loadComponent: () =>
      import('../../../components/private/work-calendar/work-calendar.component').then(
        (component) => component.WorkCalendarComponent,
      ),
  },
  {
    path: APP_PATHS.publications,
    loadComponent: () =>
      import('../../../components/private/publications/publications.component').then(
        (component) => component.PublicationsComponent,
      ),
  },
  {
    path: APP_PATHS.holidays,
    loadComponent: () =>
      import('../../../components/private/holidays/holidays.component').then(
        (component) => component.HolidaysComponent,
      ),
  },
  {
    path: APP_PATHS.chatRooms,
    loadComponent: () =>
      import('../../../components/private/chat/chat.component').then(
        (component) => component.ChatComponent,
      ),
  },
  {
    path: APP_PATHS.notifications,
    loadComponent: () =>
      import('../../../components/private/notifications/notifications.component').then(
        (component) => component.NotificationsComponent,
      ),
  },
  {
    path: APP_PATHS.profileDetails,
    loadComponent: () =>
      import('../../../components/private/profile-details/profile-details.component').then(
        (component) => component.ProfileDetailsComponent,
      ),
  },
  {
    path: APP_PATHS.apiProjects,
    loadComponent: () =>
      import('../../../components/private/api-projects/api-projects.component').then(
        (component) => component.ApiProjectsComponent,
      ),
  },
  {
    path: '**',
    redirectTo: APP_PATHS.calendar,
  },
];
