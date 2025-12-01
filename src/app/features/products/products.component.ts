import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime, finalize } from 'rxjs/operators';
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
import { SupplierDialogComponent } from './supplier-dialog/supplier-dialog.component';
import { PurchaseOrderDialogComponent } from './purchase-order-dialog/purchase-order-dialog.component';
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

interface DialogData {
  isEditMode?: boolean;
  product?: Product;
  lstCategory?: any[];
  lstUnit?: any[];
  lstSupplier?: any[];
}

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  imports: [CommonModule, FormsModule, TableModule, Select, ToastModule],
  standalone: true,
})
export class ProductsComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();
  private readonly searchSubject$ = new Subject<string>();
  private readonly SEARCH_DEBOUNCE_MS = 300;
  private readonly EXPORT_DELAY_MS = 100;

  products: Product[] = [];
  filteredProducts: Product[] = [];
  filterCategories: Category[] = [];
  searchText = '';
  selectedFilterCategory: Category | null = null;
  selectedStockFilter: StockFilter | null = null;
  loading = false;
  exporting = false;
  reorderCount = 0;
  outOfStockCount = 0;

  readonly stockFilters: StockFilter[] = [
    { name: 'Tất cả', code: 'all' },
    { name: 'Còn hàng', code: 'in_stock' },
    { name: 'Sắp hết', code: 'low_stock' },
    { name: 'Hết hàng', code: 'out_stock' },
  ];

  readonly units = [
    { name: 'Cái', code: 0 },
    { name: 'Lon', code: 1 },
    { name: 'Chai', code: 2 },
    { name: 'Hộp', code: 3 },
    { name: 'Gói', code: 4 },
    { name: 'Vỉ', code: 5 },
    { name: 'Cây', code: 6 },
    { name: 'Quả', code: 7 },
    { name: 'Bịch', code: 8 },
    { name: 'Gram', code: 9 },
    { name: 'Kilogram', code: 10 },
    { name: 'Lạng', code: 11 },
    { name: 'Mililít', code: 12 },
    { name: 'Lít', code: 13 },
    { name: 'Thùng', code: 14 },
    { name: 'Bao', code: 15 },
    { name: 'Bó', code: 16 },
  ];

  constructor(
    private readonly dialog: MatDialog,
    private readonly service: Service,
    private readonly messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.getProducts();
    this.setupSearchListener();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.searchSubject$.complete();
  }

  getProducts(filters?: Record<string, any>): void {
    if (this.loading) return;

    this.loading = true;

    const subscription = this.service
      .getProducts(filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          if (response.status === ConstantDef.STATUS_SUCCESS) {
            this.products = Array.isArray(response.response) ? response.response : [];
            this.updateFilterCategories();
            this.calculateStats();
            this.applyFilters();
          } else {
            this.showError('Không thể tải danh sách sản phẩm');
          }
        },
        error: (error: any) => {
          console.error('Load products error:', error);
          const errorMsg =
            error?.error?.response?.error_message_vn ||
            error?.error?.response?.error_message_us ||
            'Lỗi kết nối khi tải sản phẩm';
          this.showError(errorMsg);
        },
      });

    this.subscriptions.add(subscription);
  }

  openAddProductDialog(): void {
    this.loadCategoriesAndSuppliers((categories, suppliers) => {
      const dialogData: DialogData = {
        isEditMode: false,
        lstCategory: categories,
        lstUnit: this.units,
        lstSupplier: suppliers,
      };

      const dialogRef = this.dialog.open(AddEditProductDialogComponent, {
        width: '90vw',
        maxWidth: '900px',
        disableClose: true,
        data: dialogData,
      });

      const subscription = dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.getProducts();
        }
      });

      this.subscriptions.add(subscription);
    });
  }

  openBulkImportDialog(): void {
    this.loadCategoriesAndSuppliers((categories, suppliers) => {
      const dialogRef = this.dialog.open(BulkImportDialogComponent, {
        width: '90vw',
        maxWidth: '800px',
        disableClose: true,
        data: {
          lstCategory: categories,
          lstSupplier: suppliers,
        },
      });

      const subscription = dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.getProducts();
        }
      });

      this.subscriptions.add(subscription);
    });
  }

  openSupplierDialog(): void {
    this.dialog.open(SupplierDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: false,
    });
  }

  openPurchaseOrderDialog(): void {
    const dialogRef = this.dialog.open(PurchaseOrderDialogComponent, {
      width: '1100px',
      maxWidth: '95vw',
      disableClose: true,
    });

    const subscription = dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.showSuccess('Đơn đặt hàng đã được tạo thành công');
        this.getProducts();
      }
    });

    this.subscriptions.add(subscription);
  }

  editProduct(product: Product): void {
    this.loadCategoriesAndSuppliers((categories, suppliers) => {
      const dialogData: DialogData = {
        isEditMode: true,
        product,
        lstCategory: categories,
        lstUnit: this.units,
        lstSupplier: suppliers,
      };

      const dialogRef = this.dialog.open(AddEditProductDialogComponent, {
        width: '90vw',
        maxWidth: '900px',
        disableClose: true,
        data: dialogData,
      });

      const subscription = dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.getProducts();
        }
      });

      this.subscriptions.add(subscription);
    });
  }

  confirmDelete(product: Product): void {
    if (!product.bar_code) {
      this.showError('Không tìm thấy mã sản phẩm');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
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

    const subscription = dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.deleteProduct(product.bar_code!);
      }
    });

    this.subscriptions.add(subscription);
  }

  viewDetail(product: Product): void {
    this.dialog.open(ProductDetailDialogComponent, {
      width: '90vw',
      maxWidth: '600px',
      data: { product },
    });
  }

  onSearch(): void {
    this.searchSubject$.next(this.searchText);
  }

  clearSearch(): void {
    this.searchText = '';
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  exportExcel(): void {
    if (!this.filteredProducts?.length) {
      this.showError('Không có dữ liệu để xuất');
      return;
    }

    if (this.exporting) return;

    this.exporting = true;

    setTimeout(() => {
      try {
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

        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForExport);
        worksheet['!cols'] = [
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

        const workbook: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'SanPham');

        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const fileName = `DanhSach_SanPham_${timestamp}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        this.showSuccess('Xuất Excel thành công');
      } catch (error) {
        console.error('Export Excel error:', error);
        this.showError('Không thể xuất file Excel');
      } finally {
        this.exporting = false;
      }
    }, this.EXPORT_DELAY_MS);
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

  private setupSearchListener(): void {
    const subscription = this.searchSubject$
      .pipe(debounceTime(this.SEARCH_DEBOUNCE_MS))
      .subscribe(() => this.applyFilters());

    this.subscriptions.add(subscription);
  }

  private updateFilterCategories(): void {
    const uniqueCategories = new Set(
      this.products.map((p) => p.name_category).filter(Boolean)
    );

    this.filterCategories = Array.from(uniqueCategories)
      .sort()
      .map((name) => ({
        name,
        code: name.toLowerCase().replace(/\s+/g, '_'),
      }));
  }

  private calculateStats(): void {
    this.reorderCount = this.products.filter(
      (p) => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_point
    ).length;

    this.outOfStockCount = this.products.filter((p) => p.stock_quantity === 0).length;
  }

  private loadCategoriesAndSuppliers(
    callback: (categories: any[], suppliers: any[]) => void
  ): void {
    const subscription = forkJoin({
      categories: this.service.getCategories(),
      suppliers: this.service.getSuppliers(),
    }).subscribe({
      next: (result) => {
        const categories =
          result.categories.status === ConstantDef.STATUS_SUCCESS
            ? result.categories.response.data
            : [];
        const suppliers =
          result.suppliers.status === ConstantDef.STATUS_SUCCESS
            ? result.suppliers.response
            : [];

        callback(categories, suppliers);
      },
      error: (error) => {
        console.error('Load categories and suppliers error:', error);
        this.showError('Không thể tải danh mục và nhà cung cấp');
      },
    });

    this.subscriptions.add(subscription);
  }

  private deleteProduct(barCode: string): void {
    const subscription = this.service.deleteProduct(barCode).subscribe({
      next: (response: any) => {
        if (response.status === ConstantDef.STATUS_SUCCESS) {
          this.showSuccess('Xóa sản phẩm thành công');
          this.getProducts();
        } else {
          const errorMsg =
            response.response?.error_message_vn ||
            response.response?.error_message_us ||
            'Không thể xóa sản phẩm';
          this.showError(errorMsg);
        }
      },
      error: (error: any) => {
        console.error('Delete product error:', error);
        const errorMsg =
          error?.error?.response?.error_message_vn ||
          error?.error?.response?.error_message_us ||
          'Lỗi khi xóa sản phẩm';
        this.showError(errorMsg);
      },
    });

    this.subscriptions.add(subscription);
  }

  private applyFilters(): void {
    let filtered = [...this.products];

    filtered = this.applySearchFilter(filtered);
    filtered = this.applyCategoryFilter(filtered);
    filtered = this.applyStockFilter(filtered);

    this.filteredProducts = filtered;
  }

  private applySearchFilter(products: Product[]): Product[] {
    if (!this.searchText) return products;

    const searchTerm = this.searchText.toLowerCase().trim();

    return products.filter((product) => {
      const searchableFields = [
        product.name,
        product.sku,
        product.bar_code,
        product.primary_supplier_name,
        product.name_category,
      ];

      return searchableFields.some((field) => field?.toLowerCase().includes(searchTerm));
    });
  }

  private applyCategoryFilter(products: Product[]): Product[] {
    if (!this.selectedFilterCategory) return products;

    return products.filter(
      (product) => product.name_category === this.selectedFilterCategory!.name
    );
  }

  private applyStockFilter(products: Product[]): Product[] {
    if (!this.selectedStockFilter || this.selectedStockFilter.code === 'all') {
      return products;
    }

    const filterMap: Record<string, (p: Product) => boolean> = {
      in_stock: (p) => p.stock_quantity > p.reorder_point,
      low_stock: (p) => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_point,
      out_stock: (p) => p.stock_quantity === 0,
    };

    const filterFn = filterMap[this.selectedStockFilter.code];
    return filterFn ? products.filter(filterFn) : products;
  }

  private showSuccess(detail: string): void {
    this.showNotification('success', 'Thành công', detail);
  }

  private showError(detail: string): void {
    this.showNotification('error', 'Lỗi', detail);
  }

  private showNotification(
    severity: 'success' | 'error' | 'info',
    summary: string,
    detail: string
  ): void {
    this.messageService.add({
      severity,
      summary,
      detail,
      life: severity === 'error' ? 5000 : 3000,
    });
  }
}
