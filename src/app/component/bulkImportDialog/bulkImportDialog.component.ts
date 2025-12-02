import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ExcelService, ExcelColumn } from '../../core/services/excel.service';
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';

interface BulkProduct {
  name: string;
  sku: string;
  barCode: string;
  category: string;
  costPrice: number;
  price: number;
  quantity: number;
  unit: string;
}

interface ImportResult {
  success: number;
  failed: number;
  total: number;
  errors: Array<{ product: string; message: string }>;
}

@Component({
  selector: 'app-bulk-import-dialog',
  templateUrl: './bulkImportDialog.component.html',
  styleUrl: './bulkImportDialog.component.scss',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatProgressSpinnerModule, ToastModule],
  standalone: true,
})
export class BulkImportDialogComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  currentStep = 1;
  selectedFile: File | null = null;
  isDragOver = false;
  loading = false;
  parsingInvoice = false;

  validProducts: BulkProduct[] = [];
  errors: any[] = [];
  totalRows = 0;

  importSuccess = false;
  importResult: ImportResult = {
    success: 0,
    failed: 0,
    total: 0,
    errors: [],
  };

  private readonly excelColumns: ExcelColumn[] = [
    { field: 'name', header: 'Tên sản phẩm', required: true, type: 'string' },
    { field: 'sku', header: 'SKU', required: true, type: 'string' },
    { field: 'barCode', header: 'Barcode', required: true, type: 'string' },
    { field: 'category', header: 'Phân loại', required: true, type: 'string' },
    {
      field: 'costPrice',
      header: 'Giá nhập',
      required: true,
      type: 'number',
      validator: (value: number) => value > 0,
    },
    {
      field: 'price',
      header: 'Giá bán',
      required: true,
      type: 'number',
      validator: (value: number) => value > 0,
    },
    {
      field: 'quantity',
      header: 'Số lượng',
      required: true,
      type: 'number',
      validator: (value: number) => value >= 0,
    },
    { field: 'unit', header: 'Đơn vị', required: true, type: 'string' },
  ];

  private readonly validFileTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  constructor(
    public dialogRef: MatDialogRef<BulkImportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private excelService: ExcelService,
    private service: Service,
    private message: MessageService
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  downloadTemplate(): void {
    this.excelService.downloadTemplate(this.excelColumns, 'MauSanPham');
    this.showSuccess('Đã tải file mẫu thành công');
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  handleFile(file: File): void {
    if (!this.isValidFileType(file)) {
      this.showError('Định dạng file không hợp lệ. Vui lòng chọn file Excel (.xlsx, .xls)');
      return;
    }

    if (!this.isValidFileSize(file)) {
      this.showError('Kích thước file quá lớn. Tối đa 10MB');
      return;
    }

    this.selectedFile = file;
  }

  removeFile(): void {
    this.selectedFile = null;
  }

  onInvoiceImageSelect(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showError('Vui lòng chọn file ảnh (JPG, PNG, WEBP)');
      return;
    }

    if (!this.isValidFileSize(file, 10)) {
      this.showError('Kích thước file quá lớn. Tối đa 10MB');
      return;
    }

    this.parseInvoiceImage(file);
    event.target.value = '';
  }

  private parseInvoiceImage(file: File): void {
    this.parsingInvoice = true;
    this.validProducts = [];
    this.errors = [];
    this.totalRows = 0;

    const formData = new FormData();
    formData.append('file', file);

    const sub = this.service
      .parseProductInvoiceImage(formData)
      .pipe(finalize(() => (this.parsingInvoice = false)))
      .subscribe({
        next: (response: any) => {
          if (response.status === ConstantDef.STATUS_SUCCESS) {
            const products = response.response?.products || [];
            if (!products.length) {
              this.showError('Không tìm thấy sản phẩm nào trong hóa đơn');
              return;
            }

            this.validProducts = products;
            this.totalRows = products.length;
            this.currentStep = 2;
            this.showSuccess(`Đã đọc được ${products.length} sản phẩm từ hóa đơn`);
          } else {
            const errorMsg = response.response?.error_message_vn || 'Không thể đọc hóa đơn';
            const suggestion = response.response?.suggestion;
            const debugInfo = response.response?.debug_info;

            let fullMessage = errorMsg;
            if (suggestion) {
              fullMessage += `\n\n${suggestion}`;
            }

            if (debugInfo) {
              console.log('Debug OCR Info:', debugInfo);
              if (debugInfo.ocr_lines_sample) {
                fullMessage += `\n\nOCR đọc được:\n${debugInfo.ocr_lines_sample.slice(0, 5).join('\n')}`;
              }
              if (debugInfo.sample_product_names) {
                fullMessage += `\n\nSản phẩm trong hệ thống:\n${debugInfo.sample_product_names.join(', ')}`;
              }
            }

            this.showError(fullMessage);
          }
        },
        error: (error: any) => {
          const errorMsg = error?.error?.response?.error_message_vn || 'Lỗi hệ thống khi đọc hóa đơn';
          const suggestion = error?.error?.response?.suggestion;
          if (suggestion) {
            this.showError(`${errorMsg}\n\n${suggestion}`);
          } else {
            this.showError(errorMsg);
          }
        },
      });

    this.subscriptions.add(sub);
  }

  private isValidFileType(file: File): boolean {
    return this.validFileTypes.includes(file.type);
  }

  private isValidFileSize(file: File, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  async processFile(): Promise<void> {
    if (!this.selectedFile) {
      this.showError('Vui lòng chọn file');
      return;
    }

    this.loading = true;

    try {
      const result = await this.excelService.readExcel<BulkProduct>(
        this.selectedFile,
        this.excelColumns
      );

      this.validProducts = result.data;
      this.errors = result.errors;
      this.totalRows = result.totalRows;

      this.handleProcessResult(result);
    } catch (error) {
      console.error('Process file error:', error);
      this.showError('Không thể đọc file. Vui lòng kiểm tra định dạng file');
    } finally {
      this.loading = false;
    }
  }

  private handleProcessResult(result: any): void {
    if (result.success) {
      this.showSuccess(`Đã đọc thành công ${result.validRows} sản phẩm từ file`);
    } else if (result.errors.length > 0) {
      this.showWarning(
        `Tìm thấy ${result.errors.length} lỗi trong file. Vui lòng kiểm tra lại`
      );
    }
    this.currentStep = 2;
  }

  importProducts(): void {
    if (!this.validProducts.length) {
      this.showError('Không có sản phẩm hợp lệ để thêm');
      return;
    }

    this.loading = true;

    const subscription = this.service
      .bulkCreateProducts({ products: this.validProducts })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          if (response.status === ConstantDef.STATUS_SUCCESS) {
            this.handleImportSuccess(response.response);
          } else {
            this.showError(response.message || 'Có lỗi xảy ra khi thêm sản phẩm');
          }
        },
        error: (error: any) => {
          console.error('Import products error:', error);
          this.showError('Lỗi hệ thống. Vui lòng thử lại sau');
        },
      });

    this.subscriptions.add(subscription);
  }

  private handleImportSuccess(response: any): void {
    this.importResult = {
      success: response.success || 0,
      failed: response.failed || 0,
      total: response.total || 0,
      errors: response.errors || [],
    };

    this.importSuccess = this.importResult.failed === 0;
    this.currentStep = 3;

    if (this.importSuccess) {
      this.showSuccess(`Đã thêm thành công ${this.importResult.success} sản phẩm`);
    } else {
      this.showWarning(
        `Thêm thành công ${this.importResult.success}/${this.importResult.total} sản phẩm`
      );
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  close(): void {
    this.dialogRef.close(this.importSuccess);
  }

  private showSuccess(detail: string): void {
    this.showNotification('success', 'Thành công', detail);
  }

  private showError(detail: string): void {
    this.showNotification('error', 'Lỗi', detail);
  }

  private showWarning(detail: string): void {
    this.showNotification('warn', 'Cảnh báo', detail);
  }

  private showNotification(severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string): void {
    this.message.add({
      severity,
      summary,
      detail,
      life: severity === 'error' ? 5000 : 3000,
    });
  }
}
