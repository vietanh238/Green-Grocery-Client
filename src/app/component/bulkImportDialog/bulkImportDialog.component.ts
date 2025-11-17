import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
export class BulkImportDialogComponent implements OnInit {
  currentStep: number = 1;
  selectedFile: File | null = null;
  isDragOver: boolean = false;
  loading: boolean = false;

  validProducts: BulkProduct[] = [];
  errors: any[] = [];
  totalRows: number = 0;

  importSuccess: boolean = false;
  importResult: ImportResult = {
    success: 0,
    failed: 0,
    total: 0,
    errors: [],
  };

  private excelColumns: ExcelColumn[] = [
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

  constructor(
    public dialogRef: MatDialogRef<BulkImportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private excelService: ExcelService,
    private service: Service,
    private message: MessageService
  ) {}

  ngOnInit(): void {}

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
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!validTypes.includes(file.type)) {
      this.showError('Định dạng file không hợp lệ. Vui lòng chọn file Excel (.xlsx, .xls)');
      return;
    }

    this.selectedFile = file;
  }

  removeFile(): void {
    this.selectedFile = null;
  }

  async processFile(): Promise<void> {
    if (!this.selectedFile) return;

    this.loading = true;

    try {
      const result = await this.excelService.readExcel<BulkProduct>(
        this.selectedFile,
        this.excelColumns
      );

      this.validProducts = result.data;
      this.errors = result.errors;
      this.totalRows = result.totalRows;

      if (result.success) {
        this.showSuccess(`Đã đọc thành công ${result.validRows} sản phẩm từ file`);
        this.currentStep = 2;
      } else {
        this.showWarning(`Tìm thấy ${result.errors.length} lỗi trong file. Vui lòng kiểm tra lại`);
        this.currentStep = 2;
      }
    } catch (error) {
      this.showError('Không thể đọc file. Vui lòng kiểm tra định dạng file');
    } finally {
      this.loading = false;
    }
  }

  importProducts(): void {
    if (this.validProducts.length === 0) {
      this.showError('Không có sản phẩm hợp lệ để thêm');
      return;
    }

    this.loading = true;

    this.service.bulkCreateProducts({ products: this.validProducts }).subscribe({
      next: (rs: any) => {
        this.loading = false;

        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          const response = rs.response;
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
        } else {
          this.showError('Có lỗi xảy ra khi thêm sản phẩm');
        }
      },
      error: (_error: any) => {
        this.loading = false;
        this.showError('Lỗi hệ thống. Vui lòng thử lại sau');
      },
    });
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close(this.importSuccess);
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

  private showWarning(detail: string): void {
    this.message.add({
      severity: 'warn',
      summary: 'Thông báo',
      detail,
      life: 3000,
    });
  }
}
