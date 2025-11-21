import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Service } from '../../core/services/service';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DialogModule,
    ToastModule,
    ButtonModule,
    InputTextModule,
    TooltipModule
  ],
  providers: [MessageService]
})
export class InventoryComponent implements OnInit {
  loading: boolean = false;
  products: any[] = [];
  selectedProduct: any = null;

  // Transaction history
  inventoryHistory: any[] = [];
  showHistoryDialog: boolean = false;

  // Adjustment dialog
  showAdjustmentDialog: boolean = false;
  adjustmentForm = {
    new_quantity: 0,
    reason: ''
  };

  // Damage/Lost dialog
  showDamageLostDialog: boolean = false;
  damageLostForm = {
    type: 'damage',
    quantity: 0,
    reason: ''
  };

  // Statistics
  statistics = {
    total_products: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    total_stock_value: 0
  };

  constructor(
    private service: Service,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadStatistics();
  }

  loadProducts(): void {
    this.loading = true;
    this.service.getProducts().subscribe({
      next: (response: any) => {
        if (response.status === '1') {
          this.products = response.response.products || [];
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể tải danh sách sản phẩm'
        });
        this.loading = false;
      }
    });
  }

  loadStatistics(): void {
    this.service.getInventorySummary().subscribe({
      next: (response: any) => {
        if (response.status === '1') {
          this.statistics = response.response.statistics || {};
        }
      },
      error: (error: any) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  viewHistory(product: any): void {
    this.selectedProduct = product;
    this.loading = true;

    this.service.getInventoryHistory(product.id).subscribe({
      next: (response: any) => {
        if (response.status === '1') {
          this.inventoryHistory = response.response.history || [];
          this.showHistoryDialog = true;
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading history:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể tải lịch sử tồn kho'
        });
        this.loading = false;
      }
    });
  }

  openAdjustmentDialog(product: any): void {
    this.selectedProduct = product;
    this.adjustmentForm = {
      new_quantity: product.stock_quantity,
      reason: ''
    };
    this.showAdjustmentDialog = true;
  }

  submitAdjustment(): void {
    if (!this.selectedProduct) return;

    const payload = {
      product_id: this.selectedProduct.id,
      new_quantity: this.adjustmentForm.new_quantity,
      reason: this.adjustmentForm.reason || 'Điều chỉnh tồn kho'
    };

    this.service.adjustInventory(payload).subscribe({
      next: (response: any) => {
        if (response.status === '1') {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã điều chỉnh tồn kho'
          });
          this.showAdjustmentDialog = false;
          this.loadProducts();
          this.loadStatistics();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: response.response?.error_message_vn || 'Có lỗi xảy ra'
          });
        }
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể điều chỉnh tồn kho'
        });
      }
    });
  }

  openDamageLostDialog(product: any, type: 'damage' | 'lost'): void {
    this.selectedProduct = product;
    this.damageLostForm = {
      type: type,
      quantity: 0,
      reason: ''
    };
    this.showDamageLostDialog = true;
  }

  submitDamageLost(): void {
    if (!this.selectedProduct || this.damageLostForm.quantity <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Vui lòng nhập số lượng hợp lệ'
      });
      return;
    }

    const payload = {
      product_id: this.selectedProduct.id,
      quantity: this.damageLostForm.quantity,
      reason: this.damageLostForm.reason
    };

    const apiCall = this.damageLostForm.type === 'damage'
      ? this.service.recordDamage(payload)
      : this.service.recordLost(payload);

    apiCall.subscribe({
      next: (response: any) => {
        if (response.status === '1') {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: response.response?.message || 'Đã ghi nhận'
          });
          this.showDamageLostDialog = false;
          this.loadProducts();
          this.loadStatistics();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: response.response?.error_message_vn || 'Có lỗi xảy ra'
          });
        }
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể ghi nhận'
        });
      }
    });
  }

  getStockStatus(product: any): string {
    if (product.stock_quantity === 0) return 'out-of-stock';
    if (product.stock_quantity <= product.reorder_point) return 'low-stock';
    if (product.stock_quantity > product.max_stock_level) return 'overstock';
    return 'in-stock';
  }

  getStockStatusLabel(status: string): string {
    const labels: any = {
      'out-of-stock': 'Hết hàng',
      'low-stock': 'Sắp hết',
      'overstock': 'Quá mức',
      'in-stock': 'Bình thường'
    };
    return labels[status] || status;
  }

  getTransactionTypeLabel(type: string): string {
    const labels: any = {
      'import': 'Nhập kho',
      'export': 'Xuất kho',
      'adjustment': 'Điều chỉnh',
      'damage': 'Hư hỏng',
      'lost': 'Mất hàng',
      'return': 'Trả hàng'
    };
    return labels[type] || type;
  }
}

