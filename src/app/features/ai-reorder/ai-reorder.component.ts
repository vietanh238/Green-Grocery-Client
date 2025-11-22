import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import { ForecastDetailDialogComponent } from './forecast-detail-dialog/forecast-detail-dialog.component';
import { PurchaseOrderDialogComponent } from '../products/purchase-order-dialog/purchase-order-dialog.component';
import * as XLSX from 'xlsx';

interface ReorderRecommendation {
  product_id: number;
  product_name: string;
  product_sku: string;
  current_stock: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reorder_point: number;
  optimal_order_quantity: number;
  predicted_demand_7_days: number;
  predicted_demand_30_days: number;
  days_until_stockout: number;
  estimated_cost: number;
  recommendation: string;
  unit: string;
  cost_price?: number;
  selected?: boolean;
}

@Component({
  selector: 'app-ai-reorder',
  templateUrl: './ai-reorder.component.html',
  styleUrl: './ai-reorder.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    ChartModule,
    CardModule,
    CheckboxModule,
    SelectModule,
  ],
  providers: [MessageService],
})
export class AiReorderComponent implements OnInit {
  recommendations: ReorderRecommendation[] = [];
  filteredRecommendations: ReorderRecommendation[] = [];
  selectedProducts: ReorderRecommendation[] = [];
  selectAll: boolean = false;
  loading: boolean = false;
  trainingAI: boolean = false;
  searchText: string = '';
  selectedUrgency: string | null = null;

  urgencyFilters = [
    { label: 'Tất cả', value: null },
    { label: 'Cực kỳ khẩn cấp', value: 'critical' },
    { label: 'Khẩn cấp', value: 'high' },
    { label: 'Trung bình', value: 'medium' },
    { label: 'Thấp', value: 'low' },
  ];

  summary = {
    total_products_need_reorder: 0,
    high_urgency: 0,
    medium_urgency: 0,
    low_urgency: 0,
    critical_urgency: 0,
    total_estimated_cost: 0,
  };

  chartData: any;
  chartOptions: any;

  constructor(
    private service: Service,
    private message: MessageService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeChart();
    this.loadRecommendations();
  }

  initializeChart(): void {
    this.chartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#1f2937',
            font: { size: 11 },
            usePointStyle: true,
            padding: 10,
          },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} SP (${percentage}%)`;
            },
          },
        },
      },
    };
  }

  trainAI(): void {
    this.trainingAI = true;

    this.service.trainAIModel().subscribe({
      next: (rs: any) => {
        this.trainingAI = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.showSuccess('Đã train AI thành công! Đang tải dữ liệu mới...');
          setTimeout(() => {
            this.loadRecommendations();
          }, 1000);
        } else {
          this.showError(rs.response.error_message_vn || 'Không thể train AI');
        }
      },
      error: (_error: any) => {
        this.trainingAI = false;
        this.showError('Lỗi khi train AI');
      },
    });
  }

  loadRecommendations(): void {
    this.loading = true;

    this.service.getReorderRecommendations().subscribe({
      next: (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.recommendations = rs.response.recommendations || [];
          this.recommendations.forEach((r) => (r.selected = false));
          this.summary = rs.response.summary || this.summary;
          this.updateChart();
          this.applyFilters();
        } else {
          this.showError('Không thể tải dữ liệu');
        }
      },
      error: (_error: any) => {
        this.loading = false;
        this.showError('Lỗi hệ thống');
      },
    });
  }

  updateChart(): void {
    const urgencyData = [
      this.summary.critical_urgency || 0,
      this.summary.high_urgency || 0,
      this.summary.medium_urgency || 0,
      this.summary.low_urgency || 0,
    ];

    // Only show chart if there's data
    const hasData = urgencyData.some(val => val > 0);

    this.chartData = {
      labels: ['Cực kỳ khẩn cấp', 'Khẩn cấp', 'Trung bình', 'Thấp'],
      datasets: [
        {
          data: hasData ? urgencyData : [1, 1, 1, 1], // Show dummy data if empty
          backgroundColor: hasData
            ? ['#dc2626', '#ef4444', '#f59e0b', '#16a34a']
            : ['#e5e7eb', '#e5e7eb', '#e5e7eb', '#e5e7eb'],
          hoverBackgroundColor: hasData
            ? ['#b91c1c', '#dc2626', '#d97706', '#15803d']
            : ['#d1d5db', '#d1d5db', '#d1d5db', '#d1d5db'],
          borderWidth: 0,
        },
      ],
    };

    console.log('Chart updated:', {
      hasData,
      urgencyData,
      summary: this.summary
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.recommendations];

    // Search filter
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.product_name.toLowerCase().includes(searchLower) ||
          r.product_sku.toLowerCase().includes(searchLower)
      );
    }

    // Urgency filter
    if (this.selectedUrgency) {
      filtered = filtered.filter((r) => r.urgency === this.selectedUrgency);
    }

    this.filteredRecommendations = filtered;
  }

  onSelectAllChange(): void {
    if (this.selectAll) {
      this.filteredRecommendations.forEach((r) => (r.selected = true));
      this.selectedProducts = [...this.filteredRecommendations];
    } else {
      this.filteredRecommendations.forEach((r) => (r.selected = false));
      this.selectedProducts = [];
    }
  }

  onRowSelect(item: ReorderRecommendation): void {
    if (item.selected) {
      if (!this.selectedProducts.find((p) => p.product_id === item.product_id)) {
        this.selectedProducts.push(item);
      }
    } else {
      this.selectedProducts = this.selectedProducts.filter(
        (p) => p.product_id !== item.product_id
      );
    }
    this.updateSelectAll();
  }

  updateSelectAll(): void {
    this.selectAll =
      this.filteredRecommendations.length > 0 &&
      this.filteredRecommendations.every((r) => r.selected);
  }

  isSelected(item: ReorderRecommendation): boolean {
    return !!item.selected;
  }

  viewForecast(item: ReorderRecommendation): void {
    const dialogRef = this.dialog.open(ForecastDetailDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { recommendation: item },
    });

    dialogRef.afterClosed().subscribe();
  }

  createBulkOrder(): void {
    if (this.selectedProducts.length === 0) {
      this.showWarning('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }

    // Transform AI recommendations to purchase order items
    const items = this.selectedProducts.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      product_sku: r.product_sku,
      quantity: Math.ceil(r.optimal_order_quantity),
      unit_price: r.cost_price || r.estimated_cost / r.optimal_order_quantity,
      unit: r.unit,
      note: r.recommendation,
    }));

    const dialogRef = this.dialog.open(PurchaseOrderDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { items, fromAI: true },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.showSuccess('Đã tạo đơn đặt hàng thành công!');
        // Clear selection
        this.selectedProducts = [];
        this.selectAll = false;
        this.recommendations.forEach((r) => (r.selected = false));
        this.loadRecommendations();
      }
    });
  }

  exportExcel(): void {
    if (this.filteredRecommendations.length === 0) {
      this.showWarning('Không có dữ liệu để xuất');
      return;
    }

    const exportData = this.filteredRecommendations.map((r, index) => ({
      'STT': index + 1,
      'Sản phẩm': r.product_name,
      'SKU': r.product_sku,
      'Độ ưu tiên': this.getUrgencyLabel(r.urgency),
      'Tồn kho hiện tại': `${r.current_stock} ${r.unit}`,
      'Hết hàng sau (ngày)': r.days_until_stockout,
      'Nhu cầu 7 ngày': r.predicted_demand_7_days.toFixed(1),
      'Nhu cầu 30 ngày': r.predicted_demand_30_days.toFixed(1),
      'Đề xuất nhập': `${Math.ceil(r.optimal_order_quantity)} ${r.unit}`,
      'Chi phí dự kiến (đ)': r.estimated_cost,
      'Điểm đặt lại': r.reorder_point.toFixed(1),
      'Khuyến nghị': r.recommendation,
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 5 },  // STT
      { wch: 30 }, // Sản phẩm
      { wch: 15 }, // SKU
      { wch: 12 }, // Độ ưu tiên
      { wch: 15 }, // Tồn kho
      { wch: 15 }, // Hết hàng sau
      { wch: 15 }, // Nhu cầu 7 ngày
      { wch: 15 }, // Nhu cầu 30 ngày
      { wch: 15 }, // Đề xuất nhập
      { wch: 18 }, // Chi phí
      { wch: 12 }, // Điểm đặt lại
      { wch: 50 }, // Khuyến nghị
    ];
    ws['!cols'] = colWidths;

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AI Recommendations');

    const fileName = `AI_Reorder_Recommendations_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    this.showSuccess(`Đã xuất file ${fileName}`);
  }

  getUrgencyLabel(urgency: string): string {
    const labels: { [key: string]: string } = {
      critical: 'Cực kỳ khẩn cấp',
      high: 'Khẩn cấp',
      medium: 'Trung bình',
      low: 'Thấp',
    };
    return labels[urgency] || urgency;
  }

  getUrgencySeverity(urgency: string): 'danger' | 'warn' | 'success' | 'contrast' {
    const severities: { [key: string]: 'danger' | 'warn' | 'success' | 'contrast' } = {
      critical: 'contrast',
      high: 'danger',
      medium: 'warn',
      low: 'success',
    };
    return severities[urgency] || 'success';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
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
      summary: 'Lỗi',
      detail,
      life: 3000,
    });
  }

  private showWarning(detail: string): void {
    this.message.add({
      severity: 'warn',
      summary: 'Cảnh báo',
      detail,
      life: 3000,
    });
  }
}
