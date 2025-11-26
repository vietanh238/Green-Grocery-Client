import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Service } from '../../../core/services/service';
import { MessageService } from 'primeng/api';
import { ConstantDef } from '../../../core/constanDef';

interface CashPaymentData {
  totalAmount: number;
  cartItems: any[];
}

@Component({
  selector: 'app-cash-payment',
  templateUrl: './cash-payment.component.html',
  styleUrl: './cash-payment.component.scss',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule],
})
export class CashPaymentComponent implements OnInit {
  cashForm!: FormGroup;
  totalAmount = 0;
  cartItems: any[] = [];
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CashPaymentComponent>,
    private service: Service,
    private message: MessageService,
    @Inject(MAT_DIALOG_DATA) public data: CashPaymentData
  ) {
    this.totalAmount = data.totalAmount;
    this.cartItems = data.cartItems || [];
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  get changeAmount(): number {
    const receivedAmount = this.cashForm.get('receivedAmount')?.value || 0;
    return Math.max(0, receivedAmount - this.totalAmount);
  }

  get canProcessPayment(): boolean {
    const receivedAmount = this.cashForm.get('receivedAmount')?.value || 0;
    return receivedAmount >= this.totalAmount && this.cashForm.valid && !this.isLoading;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.cashForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || field.dirty));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  setQuickAmount(amount: number): void {
    this.cashForm.patchValue({ receivedAmount: amount });
  }

  get currentReceivedAmount(): number {
    return this.cashForm.get('receivedAmount')?.value || 0;
  }

  // Các mệnh giá phổ biến
  get commonDenominations(): number[] {
    const denominations = [50000, 100000, 200000, 500000];
    return denominations.filter(denom => denom >= this.totalAmount);
  }

  // Tăng số tiền hiện tại thêm một mức
  addAmount(amount: number): void {
    const current = this.cashForm.get('receivedAmount')?.value || this.totalAmount;
    this.cashForm.patchValue({ receivedAmount: current + amount });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  processPayment(): void {
    if (!this.canProcessPayment) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isLoading = true;

    const paymentData = {
      amount: this.totalAmount,
      items: this.cartItems.map((item) => ({
        bar_code: item.bar_code,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      })),
      payment_method: 'cash',
      note: this.cashForm.get('note')?.value?.trim() || '',
    };

    this.service.cashPayment(paymentData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.status === ConstantDef.STATUS_SUCCESS) {
          this.showNotification('success', 'Thanh toán tiền mặt thành công');
          this.dialogRef.close({
            success: true,
            data: response.response,
          });
        } else {
          const errorMsg =
            response.response?.error_message_vn ||
            response.response?.error_message_us ||
            response.error_message ||
            'Thanh toán thất bại';
          this.showNotification('error', errorMsg);
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        const errorMsg =
          error?.error?.response?.error_message_vn ||
          error?.error?.response?.error_message_us ||
          error?.error?.message ||
          'Lỗi kết nối khi thanh toán';
        this.showNotification('error', errorMsg);
      },
    });
  }

  private initializeForm(): void {
    this.cashForm = this.fb.group({
      receivedAmount: [
        this.totalAmount,
        [Validators.required, Validators.min(this.totalAmount)],
      ],
      note: [''],
    });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.cashForm.controls).forEach((key) => {
      this.cashForm.get(key)?.markAsTouched();
    });
  }

  private showNotification(severity: 'success' | 'error' | 'info', detail: string): void {
    const summaryMap = {
      success: 'Thành công',
      error: 'Lỗi',
      info: 'Thông tin',
    };

    this.message.add({
      severity,
      summary: summaryMap[severity],
      detail,
      life: severity === 'error' ? 5000 : 3000,
    });
  }
}
