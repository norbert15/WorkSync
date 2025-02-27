import {
  CalendarEventEnum,
  CalendarEventStatus,
  GoogleCalendarResponseStatus,
} from '../core/constans/enums';

export interface ICalendarEvent {
  id: string;
  type: CalendarEventEnum;
  summary: string;
  description: string | null;
  location: string | null;
  userId: string;
  organizer: {
    email: string;
    displayName?: string;
  };
  eventStart: string;
  eventStartShort: string | null;
  eventEnd: string | null;
  eventEndShort: string | null;
  hangoutLink: string | null;
  attendees?: Array<{
    email: string | null;
    responseStatus?: GoogleCalendarResponseStatus;
    displayName?: string | null;
    optional?: boolean | null;
    response?: { class: string; icon: string };
  }> | null;
}

export interface ICalendar {
  label: string;
  date: string;
  dayName: string;
  monthName: string;
  status: CalendarEventStatus;
  events: Array<CalendarItemType>;
}

export type CalendarRegisterType = {
  eventStart: string;
  eventEnd: string;
  organizerEmail: string;
  organizerDisplayName: string;
  summary: string;
  description: string | null;
  type: CalendarEventEnum;
};

export type CalendarItemType = {
  type: 'task' | 'event';
  date: string;
  item: ICalendarEvent | ICalendarTask;
};

export interface ICalendarTask {
  id: string;
  title: string;
  notes: string;
  status: 'needsAction' | 'completed';
  due: string;
  webViewLink: string;
}

export type CalendarTodayEventTaskType = {
  label: string;
  time: string;
  event?: ICalendarEvent;
  task?: ICalendarTask;
  callback: (item: any) => void;
};
