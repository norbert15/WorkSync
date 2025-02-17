import { GoogleCalendarResponseStatus } from '../core/constans/enums';

export interface ICalendarEvent {
  class: string;
  summary: string;
  description: string;
  location: string | null;
  organizer: {
    email: string;
    displayName?: string;
  };
  eventStart: string;
  eventStartShort: string;
  eventEnd: string | null;
  eventEndShort: string | null;
  hangoutLink: string | null;
  attendees: Array<{
    email: string;
    responseStatus: GoogleCalendarResponseStatus;
    displayName: string | null;
    optional: boolean | null;
  }>;
}
