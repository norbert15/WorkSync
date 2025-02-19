export enum UserEnum {
  DEVELOPER = 'Developer',
  ADMINISTRATOR = 'Administrator',
}

export enum CalendarEventEnum {
  OUT_OF_HOME = 'out-of-home',
  GOOGLE_EVENT = 'google-event',
  HOLIDAY = 'holiday',
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
