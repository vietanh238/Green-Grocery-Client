import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Service } from '../../../core/services/service';
import { ConstantDef } from '../../../core/constanDef';
import { SupplierDialogComponent } from '../supplier-dialog/supplier-dialog.component';

interface Product {
  id: number;
  name: string;
  sku: string;
  unit: string;
  cost_price: number;
  stock_quantity: number;
  reorder_point: number;
}

interface POItem {
  product_id: number;
  product_name: string;
  product_sku: string;
  product_unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  note?: string;
}

interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

@Component({
  selector: 'app-purchase-order-dialog',
  templateUrl: './purchase-order-dialog.component.html',
  styleUrls: ['./purchase-order-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    TableModule,
    InputTextModule,
    InputNumberModule,
    Select,
    ToastModule
  ],
  providers: [MessageService]
})
export class PurchaseOrderDialogComponent implements OnInit {
  lowStockProducts: Product[] = [];
  selectedSupplier: Supplier | null = null;
  poItems: POItem[] = [];
  expectedDate: string = '';
  note: string = '';
  loading: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<PurchaseOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private service: Service,
    private message: MessageService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLowStockProducts();
    this.setDefaultExpectedDate();
  }

  setDefaultExpectedDate(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3); // 3 ngày sau
    this.expectedDate = tomorrow.toISOString().split('T')[0];
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  loadLowStockProducts(): void {
    this.loading = true;
    this.service.getProducts({ stock_status: 'low_stock' }).subscribe({
      next: (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.lowStockProducts = (rs.response || []).filter(
            (p: Product) => p.stock_quantity <= p.reorder_point
          );

          // Auto add to PO items
          this.lowStockProducts.forEach(product => {
            const suggestedQty = Math.max(
              product.reorder_point * 2 - product.stock_quantity,
              product.reorder_point
            );

            this.poItems.push({
              product_id: product.id,
              product_name: product.name,
              product_sku: product.sku,
              product_unit: product.unit,
              quantity: suggestedQty,
              unit_price: product.cost_price,
              total_price: suggestedQty * product.cost_price,
              note: `Tồn kho hiện tại: ${product.stock_quantity}`
            });
          });
        }
      },
      error: () => {
        this.loading = false;
        this.showError('Lỗi khi tải danh sách sản phẩm');
      }
    });
  }

  openSupplierDialog(): void {
    const supplierDialog = this.dialog.open(SupplierDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true
    });

    supplierDialog.afterClosed().subscribe((supplier: Supplier) => {
      if (supplier) {
        this.selectedSupplier = supplier;
      }
    });
  }

  updateItemTotal(item: POItem): void {
    item.total_price = item.quantity * item.unit_price;
  }

  removeItem(index: number): void {
    this.poItems.splice(index, 1);
  }

  getTotalAmount(): number {
    return this.poItems.reduce((sum, item) => sum + item.total_price, 0);
  }

  getTotalItems(): number {
    return this.poItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  canSubmit(): boolean {
    return !!(
      this.selectedSupplier &&
      this.poItems.length > 0 &&
      this.expectedDate &&
      this.poItems.every(item => item.quantity > 0 && item.unit_price > 0)
    );
  }

  submitPO(): void {
    if (!this.canSubmit()) {
      this.showError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const poData = {
      supplier_id: this.selectedSupplier!.id,
      expected_date: this.expectedDate,
      note: this.note,
      items: this.poItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        note: item.note || ''
      }))
    };

    this.loading = true;
    this.service.createPurchaseOrder(poData).subscribe({
      next: (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          const message = rs.response?.message || 'Tạo đơn đặt hàng thành công';
          const emailSent = rs.response?.email_sent;

          if (emailSent) {
            this.showSuccess(`${message} ✉️`);
          } else {
            this.showSuccess(message);
            if (this.selectedSupplier?.email) {
              this.message.add({
                severity: 'warn',
                summary: 'Thông báo',
                detail: 'Email chưa được gửi. Bạn có thể gửi lại sau.',
                life: 5000
              });
            }
          }

          this.dialogRef.close(true);
        } else {
          const errorMsg = rs.response?.error_message_vn || 'Tạo đơn thất bại';
          this.showError(errorMsg);
        }
      },
      error: () => {
        this.loading = false;
        this.showError('Lỗi hệ thống');
      }
    });
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

