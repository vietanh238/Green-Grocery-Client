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
import * as XLSX from 'xlsx';

interface Product {
  id?: number;
  name: string;
  sku: string;
  name_category: string;
  cost_price: number;
  price: number;
  unit: string;
  stock_quantity: number;
  bar_code?: string;
  image?: string;
  category_id?: number;
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
  lstCategory: any[] = [];
  lstUnit: any[] = [];
  filterCategories: any[] = [];
  stockFilters: any[] = [
    { name: 'Còn hàng', code: 'in_stock' },
    { name: 'Sắp hết hàng', code: 'low_stock' },
    { name: 'Hết hàng', code: 'out_stock' },
  ];

  searchText: string = '';
  selectedFilterCategory: any = null;
  selectedStockFilter: any = null;
  loading: boolean = false;

  constructor(
    private dialog: MatDialog,
    private service: Service,
    private message: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeUnits();
    this.getProducts();
    this.getListCategory();
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
        } else {
          this.showError('Đã có lỗi xảy ra, vui lòng thử lại sau');
        }
      },
      error: (_error: any) => {
        this.loading = false;
        this.showError('Lỗi hệ thống');
      },
    });
  }

  getListCategory(): void {
    this.service.getCategories().subscribe({
      next: (data: any) => {
        if (data.status === ConstantDef.STATUS_SUCCESS) {
          let listCategory = data.response.data || [];
          this.lstCategory = listCategory.map((item: any) => ({
            name: item.name,
            code: item.id,
          }));
          this.updateFilterCategories();
        }
      },
      error: (_error: any) => {
        this.showError('Không thể tải danh sách phân loại');
      },
    });
  }

  updateFilterCategories(): void {
    const categories = new Set(this.products.map((p) => p.name_category));
    this.filterCategories = Array.from(categories).map((cat, index) => ({
      name: cat,
      code: index,
    }));
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
      maxWidth: '600px',
      data: {
        isEditMode: false,
        lstCategory: this.lstCategory,
        lstUnit: this.lstUnit,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.getProducts();
      }
    });
  }

  editProduct(product: Product): void {
    const dialogRef = this.dialog.open(AddEditProductDialogComponent, {
      width: '90vw',
      maxWidth: '600px',
      data: {
        isEditMode: true,
        product,
        lstCategory: this.lstCategory,
        lstUnit: this.lstUnit,
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
          buttons: [
            {
              label: 'Hủy',
              class: 'default',
              value: false,
              color: '',
              background: '',
            },
            {
              label: 'Xác nhận',
              class: 'primary',
              value: true,
              color: '',
              background: '',
            },
          ],
        },
      });
      dialog.afterClosed().subscribe((result: any) => {
        if (result) {
          this.service.deleteProduct(barCode).subscribe((rs: any) => {
            if (rs.status === ConstantDef.STATUS_SUCCESS) {
              this.showSuccess('Xóa sản phẩm thành công');
              const productList = this.products;
              this.filteredProducts = productList.filter((item: any) => item?.bar_code !== barCode);
            }
          });
        }
      });
    }
  }

  viewDetail(product: Product): void {
    this.dialog.open(ProductDetailDialogComponent, {
      width: '90vw',
      maxWidth: '500px',
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
          (p.bar_code && p.bar_code.toLowerCase().includes(search))
      );
    }

    if (this.selectedFilterCategory) {
      filtered = filtered.filter((p) => p.name_category === this.selectedFilterCategory.name);
    }

    if (this.selectedStockFilter) {
      switch (this.selectedStockFilter.code) {
        case 'in_stock':
          filtered = filtered.filter((p) => p.stock_quantity > 10);
          break;
        case 'low_stock':
          filtered = filtered.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 10);
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
      'Giá nhập (VNĐ)': product.cost_price,
      'Giá bán (VNĐ)': product.price,
      'Tồn kho': product.stock_quantity,
      'Đơn vị': product.unit,
      'Link ảnh': product.image || '',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExport);

    const colWidths = [
      { wch: 5 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
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

  onImageError(event: any): void {
    const element = event.target as HTMLImageElement;
    element.onerror = null;
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
