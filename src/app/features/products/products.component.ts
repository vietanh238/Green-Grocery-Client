import { Component, OnInit } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ScannerComponent } from '../../component/scanner/scanner.component';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

declare var $: any;

interface Product {
  id?: number;
  name: string;
  sku: string;
  name_category: string;
  cost_price: number;
  price: number;
  unit: string;
  stock_quantity: number;
  barcode?: string;
  image?: string;
  category_id?: number;
}

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  imports: [
    Dialog,
    ButtonModule,
    InputTextModule,
    FormsModule,
    Select,
    ToastModule,
    TableModule,
    CommonModule,
  ],
  standalone: true,
})
export class ProductsComponent implements OnInit {
  // Dialog states
  visible: boolean = false;
  showDeleteDialog: boolean = false;
  showDetailDialog: boolean = false;
  isEditMode: boolean = false;

  // Product form fields
  productName: string = '';
  sku: string = '';
  costPrice: number = 0;
  price: number = 0;
  quantity: number = 0;
  unitSld: any;
  category: string = '';
  categorySld: any;
  barCode: string = '';
  productImage: string = '';
  selectedImageFile: File | null = null;

  // Lists and data
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

  // Selected items
  selectedProduct: Product | null = null;
  productToDelete: Product | null = null;
  currentEditId: number | null = null;

  // Filters
  searchText: string = '';
  selectedFilterCategory: any = null;
  selectedStockFilter: any = null;

  // UI states
  loading: boolean = false;
  isHasError: boolean = false;
  costPriceDisplay: string = '';
  priceDisplay: string = '';

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

  // ===== Data Loading =====
  getProducts() {
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

  getListCategory() {
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

  updateFilterCategories() {
    const categories = new Set(this.products.map((p) => p.name_category));
    this.filterCategories = Array.from(categories).map((cat, index) => ({
      name: cat,
      code: index,
    }));
  }

  initializeUnits() {
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

  // ===== Dialog Management =====
  showDialog() {
    this.isEditMode = false;
    this.visible = true;
    this.resetInput();

    if (this.lstCategory.length === 0) {
      this.getListCategory();
    }
  }

  cancelDialog() {
    this.visible = false;
    this.resetInput();
    this.resetError();
  }

  editProduct(product: Product) {
    this.isEditMode = true;
    this.currentEditId = product.id || null;
    this.visible = true;

    // Populate form with product data
    this.productName = product.name;
    this.sku = product.sku;
    this.costPrice = product.cost_price;
    this.price = product.price;
    this.quantity = product.stock_quantity;
    this.category = product.name_category;
    this.barCode = product.barcode || '';
    this.productImage = product.image || '';

    // Set displays for prices
    this.costPriceDisplay = this.formatNumberWithDots(product.cost_price.toString());
    this.priceDisplay = this.formatNumberWithDots(product.price.toString());

    // Set unit
    const unit = this.lstUnit.find((u) => u.name === product.unit);
    this.unitSld = unit || null;

    // Set category
    const category = this.lstCategory.find((c) => c.name === product.name_category);
    this.categorySld = category || null;

    // Update input displays
    setTimeout(() => {
      $('#costPrice').val(this.costPriceDisplay + ' VND');
      $('#price').val(this.priceDisplay + ' VND');
    }, 0);
  }

  confirmDelete(product: Product) {
    this.productToDelete = product;
    this.showDeleteDialog = true;
  }

  deleteProduct() {
    if (!this.productToDelete?.id) return;

    // this.service.deleteProduct(this.productToDelete.id).subscribe({
    //   next: (data: any) => {
    //     if (data.status === ConstantDef.STATUS_SUCCESS) {
    //       this.showSuccess('Xóa sản phẩm thành công');
    //       this.getProducts();
    //     } else {
    //       this.showError('Không thể xóa sản phẩm');
    //     }
    //     this.showDeleteDialog = false;
    //     this.productToDelete = null;
    //   },
    //   error: (_error: any) => {
    //     this.showError('Đã có lỗi xảy ra khi xóa sản phẩm');
    //     this.showDeleteDialog = false;
    //   },
    // });
  }

  viewDetail(product: Product) {
    this.selectedProduct = product;
    this.showDetailDialog = true;
  }

  // ===== Save & Update =====
  save() {
    this.resetError();
    this.validate();

    // if (!this.isHasError) {
    //   const params = {
    //     productName: this.productName,
    //     sku: this.sku,
    //     costPrice: this.costPrice,
    //     price: this.price,
    //     quantity: this.quantity,
    //     unit: this.unitSld.name,
    //     category: this.category,
    //     barCode: this.barCode,
    //     image: this.productImage,
    //   };

    //   const request =
    //     this.isEditMode && this.currentEditId
    //       ? this.service.updateProduct(this.currentEditId, params)
    //       : this.service.createProduct(params);

    //   request.subscribe({
    //     next: (data: any) => {
    //       if (data.status === ConstantDef.STATUS_SUCCESS) {
    //         this.visible = false;
    //         this.resetInput();
    //         this.showSuccess(
    //           this.isEditMode ? 'Cập nhật sản phẩm thành công' : 'Thêm sản phẩm thành công'
    //         );
    //         this.getProducts();
    //       } else {
    //         this.showError('Lỗi giá trị nhập vào');
    //       }
    //     },
    //     error: (_error) => {
    //       this.showError('Đã có lỗi xảy ra, vui lòng thử lại sau');
    //     },
    //   });
    // }
  }

  // ===== Validation =====
  validate() {
    if (!this.productName) {
      this.isHasError = true;
      $('#productName').addClass('invalid');
    }
    if (!this.sku) {
      this.isHasError = true;
      $('#sku').addClass('invalid');
    }
    if (!this.costPrice || this.costPrice <= 0) {
      this.isHasError = true;
      $('#costPrice').addClass('invalid');
    }
    if (!this.price || this.price <= 0) {
      this.isHasError = true;
      $('#price').addClass('invalid');
    }
    if (!this.quantity || this.quantity <= 0) {
      this.isHasError = true;
      $('#quantity').addClass('invalid');
    }
    if (!this.unitSld) {
      this.isHasError = true;
      $('#unit').addClass('invalid');
    }
    if (!this.category) {
      this.isHasError = true;
      $('#category').addClass('invalid');
    }
    if (!this.barCode) {
      this.isHasError = true;
      $('#barCode').addClass('invalid');
    }
  }

  resetError() {
    this.isHasError = false;
    $('#productName').removeClass('invalid');
    $('#sku').removeClass('invalid');
    $('#costPrice').removeClass('invalid');
    $('#price').removeClass('invalid');
    $('#quantity').removeClass('invalid');
    $('#unit').removeClass('invalid');
    $('#category').removeClass('invalid');
    $('#barCode').removeClass('invalid');
  }

  blurValidate(event: any, idItem: string) {
    const value = event.target.value;
    if (value) {
      $(`#${idItem}`).removeClass('invalid');
    }
  }

  onSelectChange(event: any, idItem: string) {
    if (event.value?.name) {
      $(`#${idItem}`).removeClass('invalid');
    }
  }

  // ===== Input Handling =====
  resetInput() {
    this.productName = '';
    this.sku = '';
    this.resetPriceField('costPrice');
    this.resetPriceField('price');
    this.quantity = 0;
    this.unitSld = undefined;
    this.category = '';
    this.categorySld = undefined;
    this.barCode = '';
    this.productImage = '';
    this.selectedImageFile = null;
    this.currentEditId = null;
  }

  changeCategory() {
    if (this.categorySld?.name) {
      this.category = this.categorySld.name;
      $('#category').removeClass('invalid');
    }
  }

  // ===== Price Input Handling =====
  inputPrice(event: any, fieldType: 'costPrice' | 'price'): void {
    const input = event.target;
    let value = input.value;

    const numericValue = value.replace(/[^\d]/g, '');
    if (numericValue === '') {
      this.setPriceValue(fieldType, 0);
      this.setPriceDisplay(fieldType, '');
      input.value = '';
      return;
    }

    this.setPriceValue(fieldType, parseInt(numericValue, 10));
    const displayValue = this.formatNumberWithDots(numericValue);
    this.setPriceDisplay(fieldType, displayValue);
    input.value = displayValue;

    setTimeout(() => {
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }, 0);
  }

  blurPrice(event: any, fieldType: 'costPrice' | 'price'): void {
    const input = event.target;
    const displayValue = this.getPriceDisplay(fieldType);

    if (displayValue && displayValue !== '0') {
      input.value = displayValue + ' VND';
    } else {
      input.value = '';
    }
  }

  focusPrice(event: any, fieldType: 'costPrice' | 'price'): void {
    const input = event.target;
    const displayValue = this.getPriceDisplay(fieldType);

    if (displayValue) {
      input.value = displayValue;
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

  pastePrice(event: ClipboardEvent, fieldType: 'costPrice' | 'price'): void {
    event.preventDefault();

    const paste = event.clipboardData?.getData('text') || '';
    const numericPaste = paste.replace(/[^\d]/g, '');

    if (numericPaste) {
      const input = event.target as HTMLInputElement;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;

      const currentNumeric = this.getPriceDisplay(fieldType).replace(/\./g, '');
      const beforeCursor = currentNumeric.substring(0, start);
      const afterCursor = currentNumeric.substring(end);
      const newNumeric = beforeCursor + numericPaste + afterCursor;

      this.setPriceValue(fieldType, parseInt(newNumeric, 10) || 0);
      const displayValue = this.formatNumberWithDots(newNumeric);
      this.setPriceDisplay(fieldType, displayValue);
      input.value = displayValue;

      const newCursorPos = beforeCursor.length + numericPaste.length;
      setTimeout(() => {
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  }

  private formatNumberWithDots(numericString: string): string {
    if (!numericString || numericString === '0') return '';
    const cleanNumber = numericString.replace(/^0+/, '') || '0';
    if (cleanNumber === '0') return '';
    return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private setPriceValue(fieldType: 'costPrice' | 'price', value: number): void {
    this[fieldType] = value;
  }

  private setPriceDisplay(fieldType: 'costPrice' | 'price', value: string): void {
    const displayField = (fieldType + 'Display') as 'costPriceDisplay' | 'priceDisplay';
    this[displayField] = value;
  }

  private getPriceDisplay(fieldType: 'costPrice' | 'price'): string {
    const displayField = (fieldType + 'Display') as 'costPriceDisplay' | 'priceDisplay';
    return this[displayField];
  }

  private resetPriceField(fieldType: 'costPrice' | 'price'): void {
    this.setPriceValue(fieldType, 0);
    this.setPriceDisplay(fieldType, '');
  }

  // ===== Image Handling =====
  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.productImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.productImage = '';
    this.selectedImageFile = null;
  }

  onImageError(event: any) {
    const element = event.target as HTMLImageElement;
    // element.src = 'assets/no-image.png';
    element.onerror = null;
  }

  onSearch() {
    this.applyFilters();
  }

  clearSearch() {
    this.searchText = '';
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.products];

    // Search filter
    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          (p.barcode && p.barcode.toLowerCase().includes(search))
      );
    }

    // Category filter
    if (this.selectedFilterCategory) {
      filtered = filtered.filter((p) => p.name_category === this.selectedFilterCategory.name);
    }

    // Stock filter
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

  // ===== Scanner =====
  openScanner() {
    this.visible = false;
    const dialogRef = this.dialog.open(ScannerComponent, {});

    dialogRef.afterClosed().subscribe((result: any) => {
      this.visible = true;
      if (result) {
        this.barCode = result[0];
        $('#barCode').removeClass('invalid');
      }
    });
  }

  // ===== Export Excel =====
  exportExcel() {
    if (!this.products || this.products.length === 0) {
      this.showError('Không có dữ liệu để xuất');
      return;
    }

    const exportData = this.filteredProducts.map((p, index) => ({
      STT: index + 1,
      'Tên sản phẩm': p.name,
      SKU: p.sku,
      'Phân loại': p.name_category,
      'Giá nhập': p.cost_price,
      'Giá bán': p.price,
      'Lợi nhuận': p.price - p.cost_price,
      'Đơn vị': p.unit,
      'Tồn kho': p.stock_quantity,
      Barcode: p.barcode || '',
    }));

    // const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    // const wb: XLSX.WorkBook = XLSX.utils.book_new();
    // XLSX.utils.book_append_sheet(wb, ws, 'Sản phẩm');

    // Set column widths
    // ws['!cols'] = [
    //   { wch: 5 }, // STT
    //   { wch: 30 }, // Tên
    //   { wch: 15 }, // SKU
    //   { wch: 20 }, // Phân loại
    //   { wch: 12 }, // Giá nhập
    //   { wch: 12 }, // Giá bán
    //   { wch: 12 }, // Lợi nhuận
    //   { wch: 10 }, // Đơn vị
    //   { wch: 10 }, // Tồn kho
    //   { wch: 15 }, // Barcode
    // ];

    const fileName = `san-pham_${new Date().getTime()}.xlsx`;
    // XLSX.writeFile(wb, fileName);
    this.showSuccess('Xuất file Excel thành công');
  }

  // ===== Notifications =====
  private showSuccess(detail: string) {
    this.message.add({
      severity: 'success',
      summary: 'Thông báo',
      detail,
      life: 3000,
    });
  }

  private showError(detail: string) {
    this.message.add({
      severity: 'error',
      summary: 'Thông báo',
      detail,
      life: 3000,
    });
  }
}
