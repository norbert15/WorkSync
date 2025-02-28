import { inject, Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

import { IconIds } from '../core/constans/enums';

@Injectable({
  providedIn: 'root',
})
export class IconsRegisterService {
  private readonly DEFAULT_PATH = 'assets/images/icons';

  private readonly iconRegistry = inject(MatIconRegistry);
  private readonly sanitizer = inject(DomSanitizer);

  public registerCustomIcons(): void {
    const iconsForRegister: Array<{ iconId: IconIds; svgPath: string }> = [
      { iconId: IconIds.CHAT_DOTS, svgPath: `${this.DEFAULT_PATH}/chat-dots.svg` },
      { iconId: IconIds.PENCIL_SQUARE, svgPath: `${this.DEFAULT_PATH}/pencil-square.svg` },
      { iconId: IconIds.SEND, svgPath: `${this.DEFAULT_PATH}/send.svg` },
      { iconId: IconIds.CHAT_SQUARE, svgPath: `${this.DEFAULT_PATH}/chat-square.svg` },
      { iconId: IconIds.CHAT_SQUARE_DOTS, svgPath: `${this.DEFAULT_PATH}/chat-square-dots.svg` },
      { iconId: IconIds.PERSON_VCARD, svgPath: `${this.DEFAULT_PATH}/person-vcard.svg` },
      { iconId: IconIds.PERSON_VIDEO, svgPath: `${this.DEFAULT_PATH}/person-video.svg` },
      { iconId: IconIds.ENVELOPE_AT, svgPath: `${this.DEFAULT_PATH}/envelope-at.svg` },
      { iconId: IconIds.SMART_PHONE, svgPath: `${this.DEFAULT_PATH}/smart-phone.svg` },
      { iconId: IconIds.BRIEFCASE, svgPath: `${this.DEFAULT_PATH}/briefcase.svg` },
      { iconId: IconIds.SHIELD_CHECK, svgPath: `${this.DEFAULT_PATH}/shield-check.svg` },
      { iconId: IconIds.GITHUB, svgPath: `${this.DEFAULT_PATH}/github.svg` },
      { iconId: IconIds.LAYERS, svgPath: `${this.DEFAULT_PATH}/layers.svg` },
      { iconId: IconIds.GRIP_VERTICAL, svgPath: `${this.DEFAULT_PATH}/grip-vertical.svg` },
      { iconId: IconIds.X_CIRCLE, svgPath: `${this.DEFAULT_PATH}/x-circle.svg` },
      { iconId: IconIds.GOOGLE, svgPath: `${this.DEFAULT_PATH}/google.svg` },
      { iconId: IconIds.CLOCK_HISTORY, svgPath: `${this.DEFAULT_PATH}/clock-history.svg` },
      { iconId: IconIds.CALENDAR_X, svgPath: `${this.DEFAULT_PATH}/calendar-x.svg` },
      { iconId: IconIds.CALENDAR_CHECK, svgPath: `${this.DEFAULT_PATH}/calendar-check.svg` },
      { iconId: IconIds.EYE, svgPath: `${this.DEFAULT_PATH}/eye.svg` },
      { iconId: IconIds.EYE_SLASH, svgPath: `${this.DEFAULT_PATH}/eye-slash.svg` },
      { iconId: IconIds.PEN, svgPath: `${this.DEFAULT_PATH}/pen.svg` },
      { iconId: IconIds.CARD_TEXT, svgPath: `${this.DEFAULT_PATH}/card-text.svg` },
      { iconId: IconIds.EMPTY_SQUARE, svgPath: `${this.DEFAULT_PATH}/empty-square.svg` },
      { iconId: IconIds.CHECK_SQUARE, svgPath: `${this.DEFAULT_PATH}/check-square.svg` },
      { iconId: IconIds.QUESTION_CIRCLE, svgPath: `${this.DEFAULT_PATH}/question-circle.svg` },
      { iconId: IconIds.HOURGLASS_SPLIT, svgPath: `${this.DEFAULT_PATH}/hourglass-split.svg` },
      { iconId: IconIds.CALENDAR_PLUS, svgPath: `${this.DEFAULT_PATH}/calendar-plus.svg` },
      { iconId: IconIds.BELL_FILL, svgPath: `${this.DEFAULT_PATH}/bell-fill.svg` },
      { iconId: IconIds.PERSON_CIRCLE, svgPath: `${this.DEFAULT_PATH}/person-circle.svg` },
      { iconId: IconIds.LOCK_FILL, svgPath: `${this.DEFAULT_PATH}/lock-fill.svg` },
      { iconId: IconIds.CHEVRON_LEFT, svgPath: `${this.DEFAULT_PATH}/chevron-left.svg` },
      { iconId: IconIds.CHECK_CIRCLE, svgPath: `${this.DEFAULT_PATH}/check-circle.svg` },
      { iconId: IconIds.TRASH, svgPath: `${this.DEFAULT_PATH}/trash.svg` },
      { iconId: IconIds.BAN, svgPath: `${this.DEFAULT_PATH}/ban.svg` },
      { iconId: IconIds.INFO_CIRCLE, svgPath: `${this.DEFAULT_PATH}/info-circle.svg` },
      {
        iconId: IconIds.EXCLAMATION_CIRCLE,
        svgPath: `${this.DEFAULT_PATH}/exclamation-circle.svg`,
      },
      { iconId: IconIds.BOX_ARROW_LEFT, svgPath: `${this.DEFAULT_PATH}/box-arrow-left.svg` },
      {
        iconId: IconIds.ARROWS_EXPAND_VERTICAL,
        svgPath: `${this.DEFAULT_PATH}/arrows-expand-vertical.svg`,
      },
      { iconId: IconIds.CALENDAR3, svgPath: `${this.DEFAULT_PATH}/calendar3.svg` },
      { iconId: IconIds.DATABASE, svgPath: `${this.DEFAULT_PATH}/database.svg` },
      { iconId: IconIds.PEOPLES, svgPath: `${this.DEFAULT_PATH}/peoples.svg` },
    ];

    for (const icon of iconsForRegister) {
      this.iconRegistry.addSvgIcon(
        icon.iconId,
        this.sanitizer.bypassSecurityTrustResourceUrl(icon.svgPath),
      );
    }
  }
}
