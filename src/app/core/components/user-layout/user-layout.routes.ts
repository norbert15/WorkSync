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
    path: APP_PATHS.holidays.root,
    loadComponent: () =>
      import('../../../components/private/holidays/holidays.component').then(
        (component) => component.HolidaysComponent,
      ),
  },
  {
    path: APP_PATHS.chatRooms.root,
    loadComponent: () =>
      import('../../../components/private/chat-rooms/chat-rooms.component').then(
        (component) => component.ChatRoomsComponent,
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
    path: '**',
    redirectTo: APP_PATHS.calendar,
  },
];
