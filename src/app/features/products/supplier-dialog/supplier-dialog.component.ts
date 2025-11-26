import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Service } from '../../../core/services/service';
import { ConstantDef } from '../../../core/constanDef';

interface Supplier {
  id?: number;
  supplier_code: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  tax_code?: string;
  payment_terms?: number;
  note?: string;
}

@Component({
  selector: 'app-supplier-dialog',
  templateUrl: './supplier-dialog.component.html',
  styleUrls: ['./supplier-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    TableModule,
    DialogModule,
    InputTextModule,
    ToastModule
  ],
  providers: [MessageService]
})
export class SupplierDialogComponent implements OnInit {
  suppliers: Supplier[] = [];
  loading: boolean = false;
  showAddDialog: boolean = false;

  newSupplier: Supplier = {
    supplier_code: '',
    name: '',
    phone: '',
    contact_person: '',
    email: '',
    address: '',
    tax_code: '',
    payment_terms: 0,
    note: ''
  };

  constructor(
    public dialogRef: MatDialogRef<SupplierDialogComponent>,
    private service: Service,
    private message: MessageService
  ) {}

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    this.loading = true;
    this.service.getSuppliers().subscribe({
      next: (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.suppliers = rs.response || [];
        } else {
          this.showError('Không thể tải danh sách nhà cung cấp');
        }
      },
      error: () => {
        this.loading = false;
        this.showError('Lỗi hệ thống');
      }
    });
  }

  openAddDialog(): void {
    this.newSupplier = {
      supplier_code: this.generateSupplierCode(),
      name: '',
      phone: '',
      contact_person: '',
      email: '',
      address: '',
      tax_code: '',
      payment_terms: 0,
      note: ''
    };
    this.showAddDialog = true;
  }

  generateSupplierCode(): string {
    const timestamp = Date.now().toString().slice(-6);
    return `SUP${timestamp}`;
  }

  saveSupplier(): void {
    if (!this.newSupplier.name || !this.newSupplier.phone) {
      this.showError('Vui lòng nhập tên và số điện thoại nhà cung cấp');
      return;
    }

    this.service.createSupplier(this.newSupplier).subscribe({
      next: (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.showSuccess('Thêm nhà cung cấp thành công');
          this.showAddDialog = false;
          this.loadSuppliers();
        } else {
          const errorMsg = rs.response?.error_message_vn || rs.response?.error_message_us || 'Thêm nhà cung cấp thất bại';
          this.showError(errorMsg);
        }
      },
      error: () => {
        this.showError('Lỗi hệ thống');
      }
    });
  }

  selectSupplier(supplier: Supplier): void {
    this.dialogRef.close(supplier);
  }

  close(): void {
    this.dialogRef.close();
  }

  private showSuccess(detail: string): void {
    this.message.add({
      severity: 'success',
      summary: 'Thành công',
      detail,
      life: 3000
    });
  }

  private showError(detail: string): void {
    this.message.add({
      severity: 'error',
      summary: 'Lỗi',
      detail,
      life: 3000
    });
  }
}








