import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

interface Button {
  label: string;
  class: 'primary' | 'warn' | 'accent' | 'default' | 'yellow' | string;
  value: any;
  color: string;
  background: string;
}

export interface ConfirmDialogData {
  title: string;
  message?: string;
  buttons: Button[];
}

@Component({
  selector: 'app-dialog-confirm',
  templateUrl: './confirmDialog.component.html',
  styleUrl: './confirmDialog.component.scss',
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  standalone: true,
})
export class ConfirmDialogComponent {
  title: string = '';
  message: string = '';
  lstButton: Button[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
    private dialogRef: MatDialogRef<ConfirmDialogComponent>
  ) {
    this.title = data.title || 'Xác nhận';
    this.message = data.message || '';
    this.lstButton = data.buttons || [
      { label: 'Hủy', color: 'default', value: false },
      { label: 'Xác nhận', color: 'primary', value: true },
    ];
  }

  onButtonClick(value: any): void {
    this.dialogRef.close(value);
  }
}
