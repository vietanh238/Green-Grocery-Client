import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Service } from '../../../core/services/service';
import { MessageService } from 'primeng/api';
import { ConstantDef } from '../../../core/constanDef';

interface DebitData {
  totalAmount: number;
  cartItems: any[];
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
  totalAmount = 0;
  cartItems: any[] = [];
  minDate: string;
  isLoading = false;
  customerExists = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DebitComponent>,
    private service: Service,
    private message: MessageService,
    @Inject(MAT_DIALOG_DATA) public data: DebitData
  ) {
    this.totalAmount = data.totalAmount;
    this.cartItems = data.cartItems || [];
    this.minDate = new Date().toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupPhoneValidation();
  }

  get paidAmount(): number {
    const debitAmount = this.debitForm.get('debitAmount')?.value || 0;
    return Math.max(0, this.totalAmount - debitAmount);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.debitForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || field.dirty));
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
    if (this.debitForm.invalid || this.isLoading) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.debitForm.value;

    const debitData = {
      customer_name: formValue.customerName.trim(),
      customer_phone: formValue.phoneNumber.trim(),
      customer_address: formValue.address?.trim() || '',
      debit_amount: parseFloat(formValue.debitAmount),
      paid_amount: this.paidAmount,
      total_amount: this.totalAmount,
      due_date: formValue.dueDate || this.getDefaultDueDate(),
      note: formValue.note?.trim() || '',
      items: this.cartItems.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      })),
    };

    const customerData = {
      name: debitData.customer_name,
      phone: debitData.customer_phone,
      address: debitData.customer_address,
    };

    this.service.createCustomer(customerData).subscribe({
      next: (customerRes: any) => {
        if (customerRes.status === ConstantDef.STATUS_SUCCESS) {
          this.createDebitRecord(debitData, customerRes.response.customer_code);
        } else {
          this.isLoading = false;
          this.showNotification('error', customerRes.error_message || 'Không thể tạo khách hàng');
        }
      },
      error: () => {
        this.isLoading = false;
        this.showNotification('error', 'Lỗi hệ thống khi tạo khách hàng');
      },
    });
  }

  private initializeForm(): void {
    this.debitForm = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(0[3|5|7|8|9])+([0-9]{8,9})\b$/)]],
      address: [''],
      debitAmount: [
        this.totalAmount,
        [Validators.required, Validators.min(1), Validators.max(this.totalAmount)],
      ],
      note: [''],
      dueDate: [this.getDefaultDueDate()],
    });
  }

  private setupPhoneValidation(): void {
    this.debitForm.get('phoneNumber')?.valueChanges.subscribe((phone) => {
      if (phone && this.debitForm.get('phoneNumber')?.valid) {
        this.checkCustomerExists(phone);
      } else {
        this.customerExists = false;
      }
    });
  }

  private getDefaultDueDate(): string {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate.toISOString().split('T')[0];
  }

  private checkCustomerExists(phone: string): void {
    this.service.getCustomers().subscribe({
      next: (response: any) => {
        if (response.status === ConstantDef.STATUS_SUCCESS) {
          const customer = response.response.find((c: any) => c.phone === phone);
          this.customerExists = !!customer;

          if (customer) {
            this.debitForm.patchValue({
              customerName: customer.name,
              address: customer.address || '',
            });
          }
        }
      },
      error: (error: any) => {
        console.error('Error checking customer:', error);
      },
    });
  }

  private createDebitRecord(debitData: any, customerCode: string): void {
    this.service.createDebit({ ...debitData, customer_code: customerCode }).subscribe({
      next: (debitRes: any) => {
        this.isLoading = false;
        if (debitRes.status === ConstantDef.STATUS_SUCCESS) {
          this.showNotification('success', 'Ghi nợ thành công');
          this.dialogRef.close({
            success: true,
            data: debitRes.response,
            customer: { customer_code: customerCode, name: debitData.customer_name },
            debit: debitRes.response,
          });
        } else {
          this.showNotification('error', debitRes.error_message || 'Không thể tạo ghi nợ');
        }
      },
      error: () => {
        this.isLoading = false;
        this.showNotification('error', 'Lỗi hệ thống khi tạo ghi nợ');
      },
    });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.debitForm.controls).forEach((key) => {
      this.debitForm.get(key)?.markAsTouched();
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
