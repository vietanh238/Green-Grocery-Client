import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import { ConfirmDialogComponent } from '../../component/confirmDialog/confirmDialog.component';
import { ProductDetailDialogComponent } from './productDetailDialog/producDetailDialog.component';
import { AddEditProductDialogComponent } from './addProductDialog/addProductDialog.component';
import { BulkImportDialogComponent } from '../../component/bulkImportDialog/bulkImportDialog.component';
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
  imports: [CommonModule, FormsModule, TableModule, Select, ToastModule],
  standalone: true,
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  filterCategories: Category[] = [];
  stockFilters: StockFilter[] = [
    { name: 'Tất cả', code: 'all' },
    { name: 'Còn hàng', code: 'in_stock' },
    { name: 'Sắp hết', code: 'low_stock' },
    { name: 'Hết hàng', code: 'out_stock' },
  ];

  searchText: string = '';
  selectedFilterCategory: Category | null = null;
  selectedStockFilter: StockFilter | null = null;
  loading: boolean = false;

  reorderCount: number = 0;
  outOfStockCount: number = 0;

  constructor(
    private dialog: MatDialog,
    private service: Service,
    private message: MessageService
  ) {}

  ngOnInit(): void {
    this.getProducts();
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
          this.calculateStats();
        } else {
          this.showError('Không thể tải danh sách sản phẩm');
        }
      },
      error: () => {
        this.loading = false;
        this.showError('Lỗi hệ thống');
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

  calculateStats(): void {
    this.reorderCount = this.products.filter(
      (p) => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_point
    ).length;
    this.outOfStockCount = this.products.filter((p) => p.stock_quantity === 0).length;
  }

  openAddProductDialog(): void {
    this.service.getCategories().subscribe((catData: any) => {
      this.service.getSuppliers().subscribe((supData: any) => {
        const dialogRef = this.dialog.open(AddEditProductDialogComponent, {
          width: '90vw',
          maxWidth: '900px',
          disableClose: true,
          data: {
            isEditMode: false,
            lstCategory: catData.status === ConstantDef.STATUS_SUCCESS ? catData.response.data : [],
            lstUnit: this.getUnits(),
            lstSupplier: supData.status === ConstantDef.STATUS_SUCCESS ? supData.response : [],
          },
        });
        dialogRef.afterClosed().subscribe((result) => {
          if (result) this.getProducts();
        });
      });
    });
  }

  openBulkImportDialog(): void {
    this.service.getCategories().subscribe((catData: any) => {
      this.service.getSuppliers().subscribe((supData: any) => {
        const dialogRef = this.dialog.open(BulkImportDialogComponent, {
          width: '90vw',
          maxWidth: '800px',
          disableClose: true,
          data: {
            lstCategory: catData.status === ConstantDef.STATUS_SUCCESS ? catData.response.data : [],
            lstSupplier: supData.status === ConstantDef.STATUS_SUCCESS ? supData.response : [],
          },
        });
        dialogRef.afterClosed().subscribe((result) => {
          if (result) this.getProducts();
        });
      });
    });
  }

  editProduct(product: Product): void {
    this.service.getCategories().subscribe((catData: any) => {
      this.service.getSuppliers().subscribe((supData: any) => {
        const dialogRef = this.dialog.open(AddEditProductDialogComponent, {
          width: '90vw',
          maxWidth: '900px',
          disableClose: true,
          data: {
            isEditMode: true,
            product,
            lstCategory: catData.status === ConstantDef.STATUS_SUCCESS ? catData.response.data : [],
            lstUnit: this.getUnits(),
            lstSupplier: supData.status === ConstantDef.STATUS_SUCCESS ? supData.response : [],
          },
        });
        dialogRef.afterClosed().subscribe((result) => {
          if (result) this.getProducts();
        });
      });
    });
  }

  confirmDelete(product: Product): void {
    const barCode = product.bar_code || '';
    if (barCode) {
      const dialog = this.dialog.open(ConfirmDialogComponent, {
        disableClose: true,
        data: {
          title: 'Xác nhận xóa sản phẩm',
          message: `Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"?`,
          buttons: [
            { label: 'Hủy', class: 'default', value: false, color: '', background: '' },
            { label: 'Xóa', class: 'warn', value: true, color: '', background: '' },
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
          filtered = filtered.filter((p) => p.stock_quantity > p.reorder_point);
          break;
        case 'low_stock':
          filtered = filtered.filter(
            (p) => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_point
          );
          break;
        case 'out_stock':
          filtered = filtered.filter((p) => p.stock_quantity === 0);
          break;
      }
    }

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
      'Giá nhập': product.cost_price,
      'Giá bán': product.price,
      'Tồn kho': product.stock_quantity,
      'Điểm đặt lại': product.reorder_point,
      'Đơn vị': product.unit,
      'Trạng thái': this.getStockStatusText(product),
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
      { wch: 10 },
      { wch: 15 },
    ];
    ws['!cols'] = colWidths;

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SanPham');

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `DanhSach_SanPham_${timestamp}.xlsx`);

    this.showSuccess('Xuất Excel thành công');
  }

  getRowClass(product: Product): string {
    if (product.stock_quantity === 0) return 'danger';
    if (product.stock_quantity <= product.reorder_point) return 'warning';
    return '';
  }

  getStockClass(product: Product): string {
    if (product.stock_quantity === 0) return 'out-of-stock';
    if (product.stock_quantity <= product.reorder_point) return 'low-stock';
    return 'in-stock';
  }

  getStockIcon(product: Product): string {
    if (product.stock_quantity === 0) return 'pi pi-times-circle';
    if (product.stock_quantity <= product.reorder_point) return 'pi pi-exclamation-triangle';
    return 'pi pi-check-circle';
  }

  getStockStatusText(product: Product): string {
    if (product.stock_quantity === 0) return 'Hết hàng';
    if (product.stock_quantity <= product.reorder_point) return 'Sắp hết';
    return 'Còn hàng';
  }

  private getUnits(): any[] {
    return [
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
