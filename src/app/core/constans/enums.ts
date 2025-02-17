export enum GoogleCalendarResponseStatus {
  NEEDS_ACTION = 'needsAction', // A meghívott még nem válaszolt a meghívásra.
  DECLINED = 'declined', // A meghívott elutasította a meghívást.
  TENTATIVE = 'tentative', // A meghívott bizonytalan (esetleg eljön).
  ACCEPTED = 'accepted', // A meghívott elfogadta a meghívást.
}
