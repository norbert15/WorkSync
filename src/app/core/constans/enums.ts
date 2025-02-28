export enum UserEnum {
  DEVELOPER = 'Developer',
  ADMINISTRATOR = 'Administrator',
}

export enum CalendarEventEnum {
  OUT_OF_HOME = 'out-of-home',
  GOOGLE_EVENT = 'google-event',
  HOLIDAY = 'holiday',
  DAY_START = 'day-start',
  DAY_END = 'day-end',
}

export enum CalendarEventStatus {
  PREVIOUS = 'previous',
  CURRENT = 'current',
  NEXT = 'next',
  TODAY = 'today',
}

export enum GoogleCalendarResponseStatus {
  NEEDS_ACTION = 'needsAction', // A meghívott még nem válaszolt a meghívásra.
  DECLINED = 'declined', // A meghívott elutasította a meghívást.
  TENTATIVE = 'tentative', // A meghívott bizonytalan (esetleg eljön).
  ACCEPTED = 'accepted', // A meghívott elfogadta a meghívást.
}

export enum RepositroyEnum {
  PUBLISH = 'publish',
  ACTIVE = 'active',
}

export enum TableOperationEnum {
  EDIT = 'edit',
  DELETE = 'delete',
  CHECK = 'checkMark',
  CANCEL = 'cancel',
  SEE = 'see',
}

export enum HolidayRequestStatus {
  UNDER_EVALUATION = 'Elbírálás alatt',
  ACCEPTED = 'Elfogadva',
  REJECTED = 'Elutasítva',
}

export enum NotificationEnum {
  INFO = 'info',
  ATTENTION = 'attention',
  BAD = 'bad',
  GOOD = 'good',
}

export enum IconIds {
  CHAT_DOTS = 'chat-dots',
  CHAT_SQUARE = 'chat-square',
  CHAT_SQUARE_DOTS = 'chat-square-dots',
  PENCIL_SQUARE = 'pencil-square',
  SEND = 'send',
  PERSON_VCARD = 'person-vcard',
  PERSON_VIDEO = 'person-video',
  ENVELOPE_AT = 'envelop-at',
  SMART_PHONE = 'smart-phone',
  BRIEFCASE = 'briefcase',
  SHIELD_CHECK = 'shield-check',
  GITHUB = 'github',
  LAYERS = 'layers',
  GRIP_VERTICAL = 'grip-vertical',
  X_CIRCLE = 'x-circle',
  GOOGLE = 'google',
  CLOCK_HISTORY = 'clock-history',
  CALENDAR_X = 'calendar-x',
  CALENDAR_CHECK = 'calendar-check',
  EYE = 'eye',
  EYE_SLASH = 'eye-slash',
  PEN = 'pen',
  CARD_TEXT = 'card-text',
  EMPTY_SQUARE = 'empty-square',
  CHECK_SQUARE = 'check-square',
  HOURGLASS_SPLIT = 'hourglass-split',
  QUESTION_CIRCLE = 'question-circle',
  CALENDAR_PLUS = 'calendar-plus',
  BELL_FILL = 'bell-fill',
  LOCK_FILL = 'lock-fill',
  PERSON_CIRCLE = 'person-circle',
  CHEVRON_LEFT = 'chevron-left',
  CHECK_CIRCLE = 'check-circle',
  TRASH = 'trash',
  BAN = 'ban',
  INFO_CIRCLE = 'info-circle',
  EXCLAMATION_CIRCLE = 'exclamation-circle',
  BOX_ARROW_LEFT = 'box-arrow-left',
  ARROWS_EXPAND_VERTICAL = 'arrows-expand-vertical',
  DATABASE = 'database',
  CALENDAR3 = 'calendar3',
  PEOPLES = 'peoples',
}
