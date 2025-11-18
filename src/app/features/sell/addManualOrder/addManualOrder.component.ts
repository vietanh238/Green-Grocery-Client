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

    // Auto-calculate total when quantity or price changes
    this.manualOrderForm.valueChanges.subscribe(() => {
      // Trigger change detection for total amount display
    });
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

  closeDialog(): void {
    this.dialogRef.close();
  }

  saveManualOrder(): void {
    if (this.manualOrderForm.valid) {
      const formValue = this.manualOrderForm.value;

      const manualProduct = {
        id: Date.now(),
        sku: `MANUAL-${Date.now()}`,
        bar_code: `MANUAL-${Date.now()}`,
        name: formValue.name.trim(),
        price: parseFloat(formValue.price),
        quantity: parseFloat(formValue.quantity),
        unit: formValue.unit.name,
        note: formValue.note?.trim() || '',
        isManual: true,
        stock_quantity: 999, // Infinite stock for manual products
        cost_price: parseFloat(formValue.price) * 0.7, // Estimate cost price
      };

      this.dialogRef.close(manualProduct);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.manualOrderForm.controls).forEach((key) => {
        this.manualOrderForm.get(key)?.markAsTouched();
      });
    }
  }

  private getOptsUnit() {
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

    // Set default unit to 'Cái'
    this.manualOrderForm.patchValue({
      unit: this.lstUnit.find((unit) => unit.code === 'piece'),
    });
  }

  // Quick price buttons
  setPrice(price: number): void {
    this.manualOrderForm.patchValue({ price: price });
  }

  // Quick quantity buttons
  setQuantity(quantity: number): void {
    this.manualOrderForm.patchValue({ quantity: quantity });
  }
}
