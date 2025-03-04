import moment from 'moment';
import {
  CalendarItemType,
  ICalendar,
  ICalendarEvent,
  ICalendarTask,
} from '../models/calendar.model';
import { CalendarEventStatus } from './constans/enums';
import { EMAIL_VALIDATION_REGEX, HUN_DAYS, HUN_MONTHS } from './constans/variables';

export function formatDateWithMoment(
  date: string | null | undefined,
  options: { formats?: string[]; useFormat?: string; defaultValue?: string } = {},
): string {
  const {
    formats = ['YYYY-MM-DDTHH:mm:ss[Z]', 'YYYY-MM-DD'],
    useFormat = 'YYYY. MM. DD. HH:mm:ss',
    defaultValue = '',
  } = options;

  if (!date) {
    return defaultValue;
  }

  const dateMoment = moment(date, formats);

  if (dateMoment.isValid()) {
    return dateMoment.format(useFormat);
  }

  return defaultValue;
}

export function formatMonthToTwoDigits(monthNumber: number): string {
  return monthNumber.toString().padStart(2, '0');
}

export function generateMonthlyCalendar(
  year: number,
  month: number,
  events: ICalendarEvent[],
  tasks: ICalendarTask[] = [],
): ICalendar[] {
  const days: ICalendar[] = [];

  const today = new Date();

  // Aktuális időszak utolsó napja,
  // Nem kell - 1 mivel a nap száma 0 így az előző hónap utolsó napját adja vissza
  const activeDate = new Date(year, month, 0);
  const currentDateStr = `${year}-${month}`;

  const nextDate = new Date(year, month, 1);
  const nextDateStr = `${nextDate.getFullYear()}-${nextDate.getMonth() + 1}`;

  const leftDaysForTheNextMonth = 7 - (activeDate.getDay() || 7);
  let maxDays = activeDate.getDate() + leftDaysForTheNextMonth;

  activeDate.setDate(1);

  const leftDaysForPrevMonth = (activeDate.getDay() || 7) - 1;
  maxDays += leftDaysForPrevMonth;

  activeDate.setDate(activeDate.getDate() - leftDaysForPrevMonth);

  for (maxDays; maxDays > 0; maxDays--) {
    const loacleDateStr = activeDate.toLocaleDateString();
    const dateStr = `${activeDate.getFullYear()}-${activeDate.getMonth() + 1}`;
    const status =
      today.toLocaleDateString() === loacleDateStr
        ? CalendarEventStatus.TODAY
        : currentDateStr === dateStr
          ? CalendarEventStatus.CURRENT
          : nextDateStr === dateStr
            ? CalendarEventStatus.NEXT
            : CalendarEventStatus.PREVIOUS;

    const dayEvents: CalendarItemType[] = events
      .filter((event) => event.eventStart.startsWith(loacleDateStr))
      .map((event) => ({
        date: event.eventStart,
        item: event,
        type: 'event',
      }));
    const dayTaks: CalendarItemType[] = tasks
      .filter((task) => task.due.startsWith(loacleDateStr))
      .map((task) => ({
        date: task.due,
        item: task,
        type: 'task',
      }));

    days.push({
      id: `${activeDate.getFullYear()}${(activeDate.getMonth() + 1).toString().padStart(2, '0')}${activeDate.getDate()}`,
      date: loacleDateStr,
      events: [...dayEvents, ...dayTaks].sort((a, b) => {
        if (a.date.length === 13) {
          return 1;
        }
        return a.date.localeCompare(b.date);
      }),
      label: formatMonthToTwoDigits(activeDate.getDate()),
      status: status,
      dayName: HUN_DAYS[activeDate.getDay()].dayName,
      monthName: HUN_MONTHS[activeDate.getMonth()].shortName,
    });
    activeDate.setDate(activeDate.getDate() + 1);
  }

  return days.sort((a, b) => a.date.localeCompare(b.date));
}

export function convertToLink(text: string | null): string {
  if (!text) {
    return '';
  }

  return text.replace(
    /(\b(?:https?:\/\/|ftp:\/\/|www\.)[^\s]+\b|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    function (match) {
      let href = match;
      if (match.startsWith('www.')) {
        href = `https://${match}`;
      } else if (EMAIL_VALIDATION_REGEX.test(match)) {
        href = `mailto:${match}`;
      }

      return (
        '<a class="label-primary cursor-pointer" target="_blank" href="' +
        href +
        '">' +
        match +
        '</a>'
      );
    },
  );
}

export function getMonogram(str: string): string {
  return str.split(' ').reduce((prev, currnet) => `${prev}${currnet.charAt(0)}`, '');
}
