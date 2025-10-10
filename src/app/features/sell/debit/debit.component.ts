import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

interface DebitData {
  totalAmount: number;
}

@Component({
  selector: 'app-debit',
  templateUrl: './debit.component.html',
  styleUrl: './debit.component.scss',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule],
})
export class DebitComponent implements OnInit {
  debitForm!: FormGroup;
  totalAmount: number = 0;
  minDate: string;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DebitComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DebitData
  ) {
    this.totalAmount = data.totalAmount;
    // Set min date to today
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.debitForm = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
      debitAmount: [
        this.totalAmount,
        [Validators.required, Validators.min(1), Validators.max(this.totalAmount)],
      ],
      note: [''],
      dueDate: [''],
    });
  }

  get paidAmount(): number {
    const debitAmount = this.debitForm.get('debitAmount')?.value || 0;
    return Math.max(0, this.totalAmount - debitAmount);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.debitForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  setDebitAmount(amount: number): void {
    this.debitForm.patchValue({ debitAmount: amount });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  saveDebit(): void {
    if (this.debitForm.valid) {
      const formValue = this.debitForm.value;

      const debitInfo = {
        customerName: formValue.customerName.trim(),
        phoneNumber: formValue.phoneNumber?.trim() || null,
        debitAmount: formValue.debitAmount,
        paidAmount: this.paidAmount,
        totalAmount: this.totalAmount,
        note: formValue.note?.trim() || null,
        dueDate: formValue.dueDate || null,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      this.dialogRef.close(debitInfo);
    } else {
      Object.keys(this.debitForm.controls).forEach((key) => {
        this.debitForm.get(key)?.markAsTouched();
      });
    }
  }
}
