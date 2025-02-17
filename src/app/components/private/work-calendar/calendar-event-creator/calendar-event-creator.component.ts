import { Component, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
import { ButtonComponent } from '../../../reusables/button/button.component';
import { InputComponent } from '../../../reusables/input/input.component';
import { IOption, SelectComponent } from '../../../reusables/select/select.component';
import { DialogsService } from '../../../../services/dialogs.service';
import { DialogModel } from '../../../../models/dialog.model';
import { take } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-calendar-event-creator',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent, SelectComponent],
  templateUrl: './calendar-event-creator.component.html',
  styleUrl: './calendar-event-creator.component.scss',
})
export class CalendarEventCreatorComponent implements OnInit {
  public newEventDialogContentTemplate = viewChild<TemplateRef<any>>(
    'newEventDialogContentTemplate',
  );

  public footerDialogTemplate = viewChild<TemplateRef<any>>('footerDialogTemplate');

  public eventForm!: FormGroup;

  private readonly dialogsService = inject(DialogsService);

  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    this.initForm();
  }

  public initForm(): void {
    this.eventForm = this.formBuilder.group({
      eventType: [null, Validators.required],
      eventStart: ['', Validators.required],
      eventEnd: ['', Validators.required],
      reason: [''],
    });
  }

  public onOptionSelect(value: number | null): void {
    if (value === 0) {
      this.eventForm.get('eventType')?.setValue('');
      window.open('https://calendar.google.com/calendar', '_blank');
    }
  }

  public onSaveClick(): void {
    console.log(this.eventForm.getRawValue());
  }

  public onCloseDialogClick(): void {
    this.dialogsService.removeLastOpenedDialog();
    this.eventForm.reset();
  }

  public onOpenNewEventDialogClick(): void {
    const newDialog: DialogModel = new DialogModel('Új esemény létrehozása', {
      content: this.newEventDialogContentTemplate(),
      footer: this.footerDialogTemplate(),
      size: 'normal',
    });
    this.dialogsService.addNewDialog(newDialog);
    newDialog.afterComplete$.subscribe({
      next: () => {
        this.eventForm.reset();
      },
    });
  }
}
