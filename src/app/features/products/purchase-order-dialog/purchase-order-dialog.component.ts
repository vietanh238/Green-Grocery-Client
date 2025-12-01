import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
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
    ToastModule,
    DialogModule
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
  allProducts: Product[] = [];
  showAddProductDialog: boolean = false;
  productSearchText: string = '';
  filteredProducts: Product[] = [];

  constructor(
    public dialogRef: MatDialogRef<PurchaseOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private service: Service,
    private message: MessageService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.setDefaultExpectedDate();

    // Nếu mở từ AI Reorder với items đã chọn
    if (this.data?.fromAI && this.data?.items && Array.isArray(this.data.items)) {
      this.loadItemsFromAI(this.data.items);
    } else {
      // Mở từ Products page - load tất cả sản phẩm hết/sắp hết hàng
      this.loadLowStockProducts();
    }
  }

  loadItemsFromAI(items: any[]): void {
    // Chuyển đổi items từ AI thành POItem format
    this.poItems = items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      product_unit: item.unit || 'Cái',
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      total_price: (item.quantity || 0) * (item.unit_price || 0),
      note: item.note || ''
    }));

    // Clear lowStockProducts vì không cần hiển thị list sản phẩm
    this.lowStockProducts = [];
    this.loading = false;
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

    // Lấy cả sản phẩm low_stock (sắp hết) và out_of_stock (hết hàng) song song
    forkJoin({
      lowStock: this.service.getProducts({ stock_status: 'low_stock' }),
      outOfStock: this.service.getProducts({ stock_status: 'out_of_stock' })
    }).subscribe({
      next: (responses) => {
        this.loading = false;

        const allProducts: Product[] = [];

        // Thêm sản phẩm low_stock (sắp hết)
        if (responses.lowStock?.status === ConstantDef.STATUS_SUCCESS) {
          const lowStock = (responses.lowStock.response || []).filter(
            (p: Product) => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_point
          );
          allProducts.push(...lowStock);
        }

        // Thêm sản phẩm out_of_stock (hết hàng)
        if (responses.outOfStock?.status === ConstantDef.STATUS_SUCCESS) {
          const outOfStock = (responses.outOfStock.response || []).filter(
            (p: Product) => p.stock_quantity === 0
          );
          allProducts.push(...outOfStock);
        }

        // Loại bỏ duplicate (nếu có) bằng cách dùng Map với id
        const uniqueProductsMap = new Map<number, Product>();
        allProducts.forEach(product => {
          if (!uniqueProductsMap.has(product.id)) {
            uniqueProductsMap.set(product.id, product);
          }
        });

        const uniqueProducts = Array.from(uniqueProductsMap.values());

        // Sắp xếp: hết hàng (stock = 0) trước, sau đó là sắp hết
        uniqueProducts.sort((a, b) => {
          if (a.stock_quantity === 0 && b.stock_quantity > 0) return -1;
          if (a.stock_quantity > 0 && b.stock_quantity === 0) return 1;
          return a.stock_quantity - b.stock_quantity;
        });

        this.lowStockProducts = uniqueProducts;

        // Auto add to PO items
        this.lowStockProducts.forEach(product => {
          // Tính số lượng đề xuất
          let suggestedQty: number;

          if (product.stock_quantity === 0) {
            // Hết hàng: đề xuất = reorder_point * 2 (hoặc 10 nếu reorder_point = 0)
            suggestedQty = product.reorder_point > 0 ? product.reorder_point * 2 : 10;
          } else {
            // Sắp hết: đề xuất = reorder_point * 2 - stock hiện tại
            suggestedQty = Math.max(
              product.reorder_point * 2 - product.stock_quantity,
              product.reorder_point
            );
          }

          // Đảm bảo số lượng tối thiểu là reorder_point (hoặc 10 nếu reorder_point = 0)
          if (product.reorder_point > 0 && suggestedQty < product.reorder_point) {
            suggestedQty = product.reorder_point;
          }

          this.poItems.push({
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            product_unit: product.unit,
            quantity: suggestedQty,
            unit_price: product.cost_price || 0,
            total_price: suggestedQty * (product.cost_price || 0),
            note: product.stock_quantity === 0
              ? 'Hết hàng'
              : `Tồn kho hiện tại: ${product.stock_quantity}`
          });
        });

        // Thông báo nếu không có sản phẩm nào
        if (this.lowStockProducts.length === 0) {
          this.message.add({
            severity: 'info',
            summary: 'Thông báo',
            detail: 'Không có sản phẩm nào cần đặt hàng',
            life: 3000
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
      disableClose: true,
      data: { selectMode: true } // Bật chế độ chọn
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

  openAddProductDialog(): void {
    this.loadAllProducts();
    this.showAddProductDialog = true;
    this.productSearchText = '';
    this.filteredProducts = [];
  }

  loadAllProducts(): void {
    this.loading = true;
    this.service.getProducts().subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.status === ConstantDef.STATUS_SUCCESS) {
          this.allProducts = response.response || [];
          this.filteredProducts = this.allProducts;
        } else {
          this.showError('Không thể tải danh sách sản phẩm');
        }
      },
      error: () => {
        this.loading = false;
        this.showError('Lỗi khi tải danh sách sản phẩm');
      }
    });
  }

  onProductSearch(): void {
    if (!this.productSearchText || this.productSearchText.trim() === '') {
      this.filteredProducts = this.allProducts;
      return;
    }

    const searchTerm = this.productSearchText.toLowerCase().trim();
    this.filteredProducts = this.allProducts.filter(product => {
      return (
        product.name.toLowerCase().includes(searchTerm) ||
        product.sku.toLowerCase().includes(searchTerm)
      );
    });
  }

  addProductToPO(product: Product): void {
    // Kiểm tra xem sản phẩm đã có trong danh sách chưa
    const existingItem = this.poItems.find(item => item.product_id === product.id);
    if (existingItem) {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Sản phẩm đã có trong danh sách đặt hàng',
        life: 2000
      });
      return;
    }

    // Thêm sản phẩm vào danh sách
    const newItem: POItem = {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      product_unit: product.unit,
      quantity: 1,
      unit_price: product.cost_price || 0,
      total_price: product.cost_price || 0,
      note: `Tồn kho hiện tại: ${product.stock_quantity}`
    };

    this.poItems.push(newItem);
    this.showAddProductDialog = false;
    this.productSearchText = '';
    this.filteredProducts = [];

    this.message.add({
      severity: 'success',
      summary: 'Thành công',
      detail: 'Đã thêm sản phẩm vào danh sách đặt hàng',
      life: 2000
    });
  }

  closeAddProductDialog(): void {
    this.showAddProductDialog = false;
    this.productSearchText = '';
    this.filteredProducts = [];
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

  getStockClass(product: Product): string {
    if (product.stock_quantity === 0) return 'out-of-stock';
    if (product.stock_quantity <= product.reorder_point) return 'low-stock';
    return 'in-stock';
  }
}

