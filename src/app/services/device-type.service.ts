import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, fromEvent, map, startWith } from 'rxjs';

const BREAK_POINTS = {
  mobile: '(max-width: 990px)',
  tablet: '(min-width: 991px) and (max-width: 1439px)',
  desktop: '(min-width: 1440px)',
};

type BreakpointName = keyof typeof BREAK_POINTS;
export type DeviceType = BreakpointName;

@Injectable({
  providedIn: 'root',
})
export class DeviceTypeService extends BehaviorSubject<BreakpointName> {
  constructor() {
    super('mobile');
    fromEvent(window, 'resize')
      .pipe(
        startWith(this.getDeviceType()),
        map(() => this.getDeviceType()),
        distinctUntilChanged(),
      )
      .subscribe(this);
  }

  private getDeviceType(): BreakpointName {
    if (window.matchMedia(BREAK_POINTS.mobile).matches) return 'mobile';
    if (window.matchMedia(BREAK_POINTS.tablet).matches) return 'tablet';
    return 'desktop';
  }
}
