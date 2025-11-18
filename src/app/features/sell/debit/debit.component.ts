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
  totalAmount: number = 0;
  cartItems: any[] = [];
  minDate: string;
  isLoading: boolean = false;
  customerExists: boolean = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DebitComponent>,
    private service: Service,
    private message: MessageService,
    @Inject(MAT_DIALOG_DATA) public data: DebitData
  ) {
    this.totalAmount = data.totalAmount;
    this.cartItems = data.cartItems || [];
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.initForm();
    this.setupPhoneValidation();
  }

  private initForm(): void {
    this.debitForm = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: [
        '',
        [Validators.required, Validators.pattern(/^(0[3|5|7|8|9])+([0-9]{8,9})\b$/)],
      ],
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
    dueDate.setDate(dueDate.getDate() + 30); // Default 30 days
    return dueDate.toISOString().split('T')[0];
  }

  private checkCustomerExists(phone: string): void {
    this.service.getCustomers().subscribe(
      (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          const customer = rs.response.find((c: any) => c.phone === phone);
          this.customerExists = !!customer;

          if (customer) {
            this.debitForm.patchValue({
              customerName: customer.name,
              address: customer.address || '',
            });
          }
        }
      },
      (error: any) => {
        console.error('Error checking customer:', error);
      }
    );
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
    if (this.debitForm.valid && !this.isLoading) {
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

      // First create/update customer
      const customerData = {
        name: debitData.customer_name,
        phone: debitData.customer_phone,
        address: debitData.customer_address,
      };

      this.service.createCustomer(customerData).subscribe(
        (customerRes: any) => {
          if (customerRes.status === ConstantDef.STATUS_SUCCESS) {
            // Then create debit
            this.service
              .createDebit({
                ...debitData,
                customer_code: customerRes.response.customer_code,
              })
              .subscribe(
                (debitRes: any) => {
                  this.isLoading = false;
                  if (debitRes.status === ConstantDef.STATUS_SUCCESS) {
                    this.showSuccess('Ghi nợ thành công');
                    this.dialogRef.close({
                      success: true,
                      data: debitRes.response,
                      customer: customerRes.response,
                      debit: debitRes.response,
                    });
                  } else {
                    this.showError(debitRes.error_message || 'Không thể tạo ghi nợ');
                  }
                },
                (debitError: any) => {
                  this.isLoading = false;
                  this.showError('Lỗi hệ thống khi tạo ghi nợ');
                }
              );
          } else {
            this.isLoading = false;
            this.showError(customerRes.error_message || 'Không thể tạo khách hàng');
          }
        },
        (customerError: any) => {
          this.isLoading = false;
          this.showError('Lỗi hệ thống khi tạo khách hàng');
        }
      );
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.debitForm.controls).forEach((key) => {
        this.debitForm.get(key)?.markAsTouched();
      });
    }
  }

  private showSuccess(detail: string) {
    this.message.add({
      severity: 'success',
      summary: 'Thành công',
      detail,
      life: 3000,
    });
  }

  private showError(detail: string) {
    this.message.add({
      severity: 'error',
      summary: 'Lỗi',
      detail,
      life: 5000,
    });
  }

  private showInfo(detail: string) {
    this.message.add({
      severity: 'info',
      summary: 'Thông tin',
      detail,
      life: 3000,
    });
  }
}
