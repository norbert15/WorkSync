import { GoogleCalendarResponseStatus } from './enums';

export const HUN_MONTHS: Array<{ monthName: string; shortName: string; monthNumber: string }> = [
  { monthName: 'Január', shortName: 'Jan', monthNumber: '01' },
  { monthName: 'Február', shortName: 'Feb', monthNumber: '02' },
  { monthName: 'Március', shortName: 'Márc', monthNumber: '03' },
  { monthName: 'Április', shortName: 'Ápr', monthNumber: '04' },
  { monthName: 'Május', shortName: 'Máj', monthNumber: '05' },
  { monthName: 'Június', shortName: 'Jún', monthNumber: '06' },
  { monthName: 'Július', shortName: 'Júl', monthNumber: '07' },
  { monthName: 'Augusztus', shortName: 'Aug', monthNumber: '08' },
  { monthName: 'Szeptember', shortName: 'Szept', monthNumber: '09' },
  { monthName: 'Október', shortName: 'Okt', monthNumber: '10' },
  { monthName: 'November', shortName: 'Nov', monthNumber: '11' },
  { monthName: 'December', shortName: 'Dec', monthNumber: '12' },
];

export const HUN_DAYS: Array<{ dayName: string; shortName: string; order: number }> = [
  { dayName: 'Vasárnap', shortName: 'V', order: 7 },
  { dayName: 'Hétfő', shortName: 'H', order: 1 },
  { dayName: 'Kedd', shortName: 'K', order: 2 },
  { dayName: 'Szerda', shortName: 'Sze', order: 3 },
  { dayName: 'Csütörtök', shortName: 'Cs', order: 4 },
  { dayName: 'Péntek', shortName: 'P', order: 5 },
  { dayName: 'Szombat', shortName: 'Szo', order: 6 },
];

export const GOOGLE_CALENDAR_RESPONES_CLASSES: Record<
  GoogleCalendarResponseStatus,
  { class: string; icon: string }
> = {
  [GoogleCalendarResponseStatus.NEEDS_ACTION]: { class: '', icon: 'bi bi-hourglass-split' },
  [GoogleCalendarResponseStatus.DECLINED]: { class: 'text-danger', icon: 'bi bi-x-circle' },
  [GoogleCalendarResponseStatus.TENTATIVE]: {
    class: 'text-secondary',
    icon: 'bi bi-question-circle',
  },
  [GoogleCalendarResponseStatus.ACCEPTED]: { class: 'text-success', icon: 'bi bi-check2-circle' },
};

export const EMAIL_VALIDATION_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
