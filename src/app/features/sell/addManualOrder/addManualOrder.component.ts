import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

interface Unit {
  name: string;
  code: string;
}

@Component({
  selector: 'app-manual-order',
  templateUrl: './addManualOrder.component.html',
  styleUrl: './addManualOrder.component.scss',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, SelectModule],
})
export class AddManualOrder implements OnInit {
  manualOrderForm!: FormGroup;
  lstUnit: Unit[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddManualOrder>
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializeUnits();
  }

  get totalAmount(): number {
    const quantity = this.manualOrderForm.get('quantity')?.value || 0;
    const price = this.manualOrderForm.get('price')?.value || 0;
    return quantity * price;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.manualOrderForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || field.dirty));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  setPrice(price: number): void {
    this.manualOrderForm.patchValue({ price });
  }

  setQuantity(quantity: number): void {
    this.manualOrderForm.patchValue({ quantity });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  saveManualOrder(): void {
    if (this.manualOrderForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    const formValue = this.manualOrderForm.value;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();

    const manualProduct = {
      id: `${timestamp}-${random}`,
      sku: `MAN-${timestamp}`,
      bar_code: `MANUAL-${timestamp}-${random}`,
      name: formValue.name.trim(),
      price: parseFloat(formValue.price),
      quantity: parseFloat(formValue.quantity),
      unit: formValue.unit.name,
      note: formValue.note?.trim() || '',
      isManual: true,
      stock_quantity: -1,
      cost_price: 0,
    };

    this.dialogRef.close(manualProduct);
  }

  private initializeForm(): void {
    this.manualOrderForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: [null, [Validators.required]],
      price: ['', [Validators.required, Validators.min(1)]],
      note: [''],
    });
  }

  private initializeUnits(): void {
    this.lstUnit = [
      { name: 'Cái', code: 'piece' },
      { name: 'Chiếc', code: 'item' },
      { name: 'Lon', code: 'can' },
      { name: 'Chai', code: 'bottle' },
      { name: 'Hộp', code: 'box' },
      { name: 'Gói', code: 'pack' },
      { name: 'Vỉ', code: 'blister' },
      { name: 'Cây', code: 'stick' },
      { name: 'Quả', code: 'fruit' },
      { name: 'Bịch', code: 'bag' },
      { name: 'Gram', code: 'gram' },
      { name: 'Kilogram', code: 'kg' },
      { name: 'Lạng', code: 'tael' },
      { name: 'Mililít', code: 'ml' },
      { name: 'Lít', code: 'liter' },
      { name: 'Thùng', code: 'case' },
      { name: 'Bao', code: 'sack' },
      { name: 'Bó', code: 'bunch' },
      { name: 'Mét', code: 'meter' },
      { name: 'Centimét', code: 'cm' },
    ];

    this.manualOrderForm.patchValue({
      unit: this.lstUnit.find((unit) => unit.code === 'piece'),
    });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.manualOrderForm.controls).forEach((key) => {
      this.manualOrderForm.get(key)?.markAsTouched();
    });
  }
}
