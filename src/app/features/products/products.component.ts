import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import { ConfirmDialogComponent } from '../../component/confirmDialog/confirmDialog.component';
import { ProductDetailDialogComponent } from './productDetailDialog/producDetailDialog.component';
import { AddEditProductDialogComponent } from './addProductDialog/addProductDialog.component';
import { BulkImportDialogComponent } from '../../component/bulkImportDialog/bulkImportDialog.component';
import { AddEditSupplierDialogComponent } from './addEditSupplierDialog/addEditSupplierDialog.component';
import * as XLSX from 'xlsx';

interface Product {
  id?: number;
  name: string;
  sku: string;
  bar_code?: string;
  name_category: string;
  category_id?: number;
  unit: string;
  cost_price: number;
  price: number;
  stock_quantity: number;
  reorder_point: number;
  max_stock_level: number;
  is_reorder?: boolean;
  is_overstock?: boolean;
  image?: string;
  description?: string;
  has_expiry?: boolean;
  shelf_life_days?: number;
  primary_supplier_name?: string;
  primary_supplier_cost?: number;
  created_by_name?: string;
  created_at_date?: string;
}

interface Supplier {
  id?: number;
  code: string;
  name: string;
  phone_number: string;
  email: string;
}

interface Category {
  id?: number;
  name: string;
  code?: string;
}

interface StockFilter {
  name: string;
  code: string;
}

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    Select,
    ToastModule,
  ],
  standalone: true,
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  lstCategory: Category[] = [];
  lstSupplier: Supplier[] = [];
  lstUnit: any[] = [];
  filterCategories: Category[] = [];
  stockFilters: StockFilter[] = [
    { name: 'Tất cả', code: 'all' },
    { name: 'Còn hàng', code: 'in_stock' },
    { name: 'Sắp hết hàng', code: 'low_stock' },
    { name: 'Hết hàng', code: 'out_stock' },
    { name: 'Vượt tồn kho', code: 'overstock' },
  ];

  searchText: string = '';
  selectedFilterCategory: Category | null = null;
  selectedStockFilter: StockFilter | null = null;
  loading: boolean = false;

  reorderCount: number = 0;
  overstockCount: number = 0;
  outOfStockCount: number = 0;

  constructor(
    private dialog: MatDialog,
    private service: Service,
    private message: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeUnits();
    this.getProducts();
    this.getListCategory();
    this.getSuppliers();
  }

  getProducts(): void {
    this.loading = true;
    this.service.getProducts().subscribe({
      next: (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.products = rs.response || [];
          this.filteredProducts = [...this.products];
          this.updateFilterCategories();
          this.calculateStockStats();
        } else {
          this.showError('Đã có lỗi xảy ra, vui lòng thử lại sau');
        }
      },
      error: () => {
        this.loading = false;
        this.showError('Lỗi hệ thống');
      },
    });
  }

  getListCategory(): void {
    this.service.getCategories().subscribe({
      next: (data: any) => {
        if (data.status === ConstantDef.STATUS_SUCCESS) {
          const listCategory = data.response.data || [];
          this.lstCategory = listCategory.map((item: any) => ({
            id: item.id,
            name: item.name,
            code: item.id,
          }));
          this.updateFilterCategories();
        }
      },
      error: () => {
        this.showError('Không thể tải danh sách phân loại');
      },
    });
  }

  getSuppliers(): void {
    this.service.getSuppliers().subscribe({
      next: (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.lstSupplier = rs.response || [];
        }
      },
      error: () => {
        this.showError('Không thể tải danh sách nhà cung cấp');
      },
    });
  }

  updateFilterCategories(): void {
    const categories = new Set(this.products.map((p) => p.name_category).filter((cat) => cat));
    this.filterCategories = Array.from(categories).map((cat, index) => ({
      name: cat,
      code: index.toString(),
    }));
  }

  calculateStockStats(): void {
    this.reorderCount = this.products.filter((p) => p.is_reorder).length;
    this.overstockCount = this.products.filter((p) => p.is_overstock).length;
    this.outOfStockCount = this.products.filter((p) => p.stock_quantity === 0).length;
  }

  initializeUnits(): void {
    this.lstUnit = [
      { name: 'Lon', code: 0 },
      { name: 'Chai', code: 1 },
      { name: 'Hộp', code: 2 },
      { name: 'Gói', code: 3 },
      { name: 'Vỉ', code: 4 },
      { name: 'Cây', code: 5 },
      { name: 'Quả', code: 6 },
      { name: 'Bịch', code: 7 },
      { name: 'Gram', code: 8 },
      { name: 'Kilogram', code: 9 },
      { name: 'Lạng', code: 10 },
      { name: 'Mililít', code: 11 },
      { name: 'Lít', code: 12 },
      { name: 'Thùng', code: 13 },
      { name: 'Bao', code: 14 },
      { name: 'Bó', code: 15 },
    ];
  }

  openAddProductDialog(): void {
    const dialogRef = this.dialog.open(AddEditProductDialogComponent, {
      width: '90vw',
      maxWidth: '900px',
      data: {
        isEditMode: false,
        lstCategory: this.lstCategory,
        lstUnit: this.lstUnit,
        lstSupplier: this.lstSupplier,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.getProducts();
      }
    });
  }

  openBulkImportDialog(): void {
    const dialogRef = this.dialog.open(BulkImportDialogComponent, {
      width: '90vw',
      maxWidth: '800px',
      data: {
        lstCategory: this.lstCategory,
        lstSupplier: this.lstSupplier,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.getProducts();
      }
    });
  }

  openAddSupplierDialog(): void {
    const dialogRef = this.dialog.open(AddEditSupplierDialogComponent, {
      width: '90vw',
      maxWidth: '800px',
      data: { isEditMode: false },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.getSuppliers();
        this.showSuccess('Thêm nhà cung cấp thành công. Vui lòng chọn nhà cung cấp cho sản phẩm.');
      }
    });
  }

  editProduct(product: Product): void {
    const dialogRef = this.dialog.open(AddEditProductDialogComponent, {
      width: '90vw',
      maxWidth: '900px',
      data: {
        isEditMode: true,
        product,
        lstCategory: this.lstCategory,
        lstUnit: this.lstUnit,
        lstSupplier: this.lstSupplier,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.getProducts();
      }
    });
  }

  confirmDelete(product: Product): void {
    const barCode = product.bar_code || '';
    if (barCode) {
      const dialog = this.dialog.open(ConfirmDialogComponent, {
        disableClose: true,
        data: {
          title: 'Xác nhận xóa sản phẩm',
          message: `Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"? Thao tác này không thể hoàn tác.`,
          buttons: [
            { label: 'Hủy', class: 'default', value: false },
            { label: 'Xóa', class: 'warn', value: true },
          ],
        },
      });
      dialog.afterClosed().subscribe((result: any) => {
        if (result) {
          this.service.deleteProduct(barCode).subscribe((rs: any) => {
            if (rs.status === ConstantDef.STATUS_SUCCESS) {
              this.showSuccess('Xóa sản phẩm thành công');
              this.getProducts();
            } else {
              this.showError('Không thể xóa sản phẩm');
            }
          });
        }
      });
    }
  }

  viewDetail(product: Product): void {
    this.dialog.open(ProductDetailDialogComponent, {
      width: '90vw',
      maxWidth: '600px',
      data: { product },
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchText = '';
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.products];

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      console.log('filter', search);
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          (p.bar_code && p.bar_code.toLowerCase().includes(search)) ||
          (p.primary_supplier_name && p.primary_supplier_name.toLowerCase().includes(search))
      );
    }

    if (this.selectedFilterCategory) {
      filtered = filtered.filter((p) => p.name_category === this.selectedFilterCategory!.name);
    }

    if (this.selectedStockFilter && this.selectedStockFilter.code !== 'all') {
      switch (this.selectedStockFilter.code) {
        case 'in_stock':
          filtered = filtered.filter((p) => p.stock_quantity > p.reorder_point && !p.is_overstock);
          break;
        case 'low_stock':
          filtered = filtered.filter(
            (p) => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_point
          );
          break;
        case 'out_stock':
          filtered = filtered.filter((p) => p.stock_quantity === 0);
          break;
        case 'overstock':
          filtered = filtered.filter((p) => p.is_overstock);
          break;
      }
    }
    console.log('filtered', filtered, this.products);
    this.filteredProducts = filtered;
  }

  exportExcel(): void {
    if (!this.filteredProducts || this.filteredProducts.length === 0) {
      this.showError('Không có dữ liệu để xuất');
      return;
    }

    const dataForExport = this.filteredProducts.map((product, index) => ({
      STT: index + 1,
      'Tên sản phẩm': product.name,
      SKU: product.sku,
      Barcode: product.bar_code || '',
      'Phân loại': product.name_category,
      'Nhà cung cấp': product.primary_supplier_name || '',
      'Giá nhập (VNĐ)': product.cost_price,
      'Giá bán (VNĐ)': product.price,
      'Tồn kho': product.stock_quantity,
      'Điểm đặt lại': product.reorder_point,
      'Tồn kho tối đa': product.max_stock_level,
      'Đơn vị': product.unit,
      'Trạng thái': this.getStockStatus(product),
      'Có HSD': product.has_expiry ? 'Có' : 'Không',
      'HSD (ngày)': product.shelf_life_days || '',
      'Link ảnh': product.image || '',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExport);

    const colWidths = [
      { wch: 5 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 30 },
    ];
    ws['!cols'] = colWidths;

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachSanPham');

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `BaoCao_SanPham_${timestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);

    this.showSuccess('Xuất báo cáo Excel thành công!');
  }

  getStockStatus(product: Product): string {
    if (product.stock_quantity === 0) return 'Hết hàng';
    if (product.is_overstock) return 'Vượt tồn kho';
    if (product.is_reorder) return 'Sắp hết hàng';
    return 'Còn hàng';
  }

  getStockStatusClass(product: Product): string {
    if (product.stock_quantity === 0) return 'out-of-stock';
    if (product.is_overstock) return 'overstock';
    if (product.is_reorder) return 'low-stock';
    return 'in-stock';
  }

  onImageError(event: any): void {
    const element = event.target as HTMLImageElement;
    element.src = 'assets/placeholder-product.png';
    element.onerror = null;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
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
