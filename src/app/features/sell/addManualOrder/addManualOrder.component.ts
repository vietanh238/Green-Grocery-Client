import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-manual-order',
  templateUrl: './addManualOrder.component.html',
  styleUrl: './addManualOrder.component.scss',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, SelectModule],
})
export class AddManualOrder implements OnInit {
  manualOrderForm!: FormGroup;
  lstUnit: any[] = [];

  constructor(private fb: FormBuilder, private dialogRef: MatDialogRef<AddManualOrder>) {}

  ngOnInit(): void {
    this.initForm();
    this.getOptsUnit();
  }

  private initForm(): void {
    this.manualOrderForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: [null, [Validators.required]],
      price: ['', [Validators.required, Validators.min(1)]],
      note: [''],
    });
  }

  get totalAmount(): number {
    const quantity = this.manualOrderForm.get('quantity')?.value || 0;
    const price = this.manualOrderForm.get('price')?.value || 0;
    return quantity * price;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.manualOrderForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  saveManualOrder(): void {
    if (this.manualOrderForm.valid) {
      const formValue = this.manualOrderForm.value;

      const manualProduct = {
        id: Date.now(),
        sku: `MANUAL-${Date.now()}`,
        name: formValue.name,
        price: formValue.price,
        quantity: formValue.quantity,
        unit: formValue.unit.name,
        note: formValue.note,
        isManual: true,
      };

      this.dialogRef.close(manualProduct);
    } else {
      Object.keys(this.manualOrderForm.controls).forEach((key) => {
        this.manualOrderForm.get(key)?.markAsTouched();
      });
    }
  }

  private getOptsUnit() {
    this.lstUnit = [
      { name: 'Lon', code: 0 },
      { name: 'Chai', code: 1 },
      { name: 'Hộp', code: 2 },
      { name: 'Gói', code: 3 },
      { name: 'Vỉ', code: 4 },
      { name: 'Cây', code: 5 },
      { name: 'Quả', code: 6 },
      { name: 'Bịch', code: 7 },
      { name: 'Gram', code: 8 },
      { name: 'Kilogram', code: 9 },
      { name: 'Lạng', code: 10 },
      { name: 'Mililít', code: 11 },
      { name: 'Lít', code: 12 },
      { name: 'Thùng', code: 13 },
      { name: 'Bao', code: 14 },
      { name: 'Bó', code: 15 },
    ];

    this.manualOrderForm.patchValue({
      unit: this.lstUnit.find((unit) => unit.code === 9),
    });
  }
}
