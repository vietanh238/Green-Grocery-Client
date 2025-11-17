import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Service } from '../../../core/services/service';
import { ConstantDef } from '../../../core/constanDef';

interface Supplier {
  id?: number;
  code: string;
  name: string;
  contact_person: string;
  phone_number: string;
  email: string;
  address: string;
  tax_code: string;
  bank_account: string;
  bank_name: string;
  payment_terms: number;
  credit_limit: number;
  notes: string;
}

@Component({
  selector: 'app-add-edit-supplier-dialog',
  templateUrl: './addEditSupplierDialog.component.html',
  styleUrl: './addEditSupplierDialog.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ToastModule,
  ],
  standalone: true,
})
export class AddEditSupplierDialogComponent implements OnInit {
  isEditMode: boolean = false;
  supplier: Supplier | null = null;

  code: string = '';
  name: string = '';
  contactPerson: string = '';
  phoneNumber: string = '';
  email: string = '';
  address: string = '';
  taxCode: string = '';
  bankAccount: string = '';
  bankName: string = '';
  paymentTerms: number = 0;
  creditLimit: number = 0;
  notes: string = '';

  errors: { [key: string]: boolean } = {};
  loading: boolean = false;
  creditLimitDisplay: string = '';

  constructor(
    public dialogRef: MatDialogRef<AddEditSupplierDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private service: Service,
    private message: MessageService
  ) {
    this.isEditMode = data.isEditMode || false;
    this.supplier = data.supplier || null;
  }

  ngOnInit(): void {
    if (this.isEditMode && this.supplier) {
      this.populateForm();
    } else {
      this.generateSupplierCode();
    }
  }

  populateForm(): void {
    if (!this.supplier) return;

    this.code = this.supplier.code;
    this.name = this.supplier.name;
    this.contactPerson = this.supplier.contact_person;
    this.phoneNumber = this.supplier.phone_number;
    this.email = this.supplier.email;
    this.address = this.supplier.address;
    this.taxCode = this.supplier.tax_code;
    this.bankAccount = this.supplier.bank_account;
    this.bankName = this.supplier.bank_name;
    this.paymentTerms = this.supplier.payment_terms;
    this.creditLimit = this.supplier.credit_limit;
    this.notes = this.supplier.notes;

    this.creditLimitDisplay = this.formatNumberWithDots(this.creditLimit.toString());
  }

  generateSupplierCode(): void {
    const timestamp = Date.now().toString().slice(-6);
    this.code = `NCC${timestamp}`;
  }

  inputCreditLimit(event: any): void {
    const input = event.target;
    let value = input.value;

    const numericValue = value.replace(/[^\d]/g, '');
    if (numericValue === '') {
      this.creditLimit = 0;
      this.creditLimitDisplay = '';
      input.value = '';
      return;
    }

    this.creditLimit = parseInt(numericValue, 10);
    const displayValue = this.formatNumberWithDots(numericValue);
    this.creditLimitDisplay = displayValue;
    input.value = displayValue;

    setTimeout(() => {
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }, 0);
  }

  blurCreditLimit(event: any): void {
    const input = event.target;
    if (this.creditLimitDisplay && this.creditLimitDisplay !== '0') {
      input.value = this.creditLimitDisplay + ' VND';
    } else {
      input.value = '';
    }
  }

  focusCreditLimit(event: any): void {
    const input = event.target;
    if (this.creditLimitDisplay) {
      input.value = this.creditLimitDisplay;
    } else {
      input.value = '';
    }
    setTimeout(() => {
      input.select();
    }, 0);
  }

  keydownPrice(event: KeyboardEvent): boolean {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab',
      'Enter',
    ];

    if (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
      return true;
    }
    if (allowedKeys.includes(event.key)) {
      return true;
    }
    if (event.key >= '0' && event.key <= '9') {
      return true;
    }

    event.preventDefault();
    return false;
  }

  validate(): boolean {
    this.errors = {};

    if (!this.code?.trim()) {
      this.errors['code'] = true;
    }
    if (!this.name?.trim()) {
      this.errors['name'] = true;
    }
    if (!this.phoneNumber?.trim()) {
      this.errors['phoneNumber'] = true;
    }
    if (this.email && !this.isValidEmail(this.email)) {
      this.errors['email'] = true;
    }
    if (this.paymentTerms < 0) {
      this.errors['paymentTerms'] = true;
    }
    if (this.creditLimit < 0) {
      this.errors['creditLimit'] = true;
    }

    return Object.keys(this.errors).length === 0;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  save(): void {
    // if (!this.validate()) {
    //   this.showError('Vui lòng điền đầy đủ các trường bắt buộc');
    //   return;
    // }
    // this.loading = true;
    // const params = {
    //   id: this.supplier?.id,
    //   code: this.code.trim(),
    //   name: this.name.trim(),
    //   contact_person: this.contactPerson.trim(),
    //   phone_number: this.phoneNumber.trim(),
    //   email: this.email.trim(),
    //   address: this.address.trim(),
    //   tax_code: this.taxCode.trim(),
    //   bank_account: this.bankAccount.trim(),
    //   bank_name: this.bankName.trim(),
    //   payment_terms: this.paymentTerms,
    //   credit_limit: this.creditLimit,
    //   notes: this.notes.trim(),
    // };
    // const request = this.isEditMode
    //   ? this.service.updateSupplier(params)
    //   : this.service.createSupplier(params);
    // request.subscribe({
    //   next: (rs: any) => {
    //     this.loading = false;
    //     if (rs.status === ConstantDef.STATUS_SUCCESS) {
    //       this.showSuccess(
    //         this.isEditMode
    //           ? 'Cập nhật nhà cung cấp thành công'
    //           : 'Thêm nhà cung cấp thành công'
    //       );
    //       this.dialogRef.close(true);
    //     } else {
    //       this.showError(rs.response.error_message_vn || 'Đã có lỗi xảy ra');
    //     }
    //   },
    //   error: () => {
    //     this.loading = false;
    //     this.showError('Đã có lỗi xảy ra, vui lòng thử lại sau');
    //   },
    // });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private formatNumberWithDots(numericString: string): string {
    if (!numericString || numericString === '0') return '';
    const cleanNumber = numericString.replace(/^0+/, '') || '0';
    if (cleanNumber === '0') return '';
    return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private showSuccess(detail: string): void {
    this.message.add({
      severity: 'success',
      summary: 'Thông báo',
      detail,
      life: 3000,
    });
  }

  private showError(detail: string): void {
    this.message.add({
      severity: 'error',
      summary: 'Thông báo',
      detail,
      life: 3000,
    });
  }
}
