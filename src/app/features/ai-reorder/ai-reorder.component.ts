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
  days_until_stockout: number | null;
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
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#374151',
            font: { size: 12, family: "'Inter', sans-serif" },
            usePointStyle: true,
            boxWidth: 8,
            padding: 15,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#111827',
          bodyColor: '#4b5563',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          callbacks: {
            label: (context: any) => {
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${context.label}: ${value} SP (${percentage}%)`;
            },
          },
        },
      },
    };
  }

  trainAI(): void {
    if (this.trainingAI) return;

    this.trainingAI = true;

    this.service.trainAIModel().subscribe({
      next: (rs: any) => {
        this.trainingAI = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          const message = rs.response?.message || 'Đã train AI thành công! Đang tải dữ liệu mới...';
          this.showSuccess(message);
          setTimeout(() => {
            this.loadRecommendations();
          }, 1000);
        } else {
          const errorMsg = rs.response?.error_message_vn || rs.response?.error_message_us || 'Không thể train AI';
          const suggestion = rs.response?.suggestion;
          this.showError(suggestion ? `${errorMsg}. ${suggestion}` : errorMsg);
        }
      },
      error: (error: any) => {
        this.trainingAI = false;
        console.error('Train AI error:', error);
        const errorMsg = error?.error?.response?.error_message_vn || error?.error?.response?.error_message_us || 'Lỗi hệ thống khi train AI';
        this.showError(errorMsg);
      },
    });
  }

  loadRecommendations(): void {
    if (this.loading) return;

    this.loading = true;

    this.service.getReorderRecommendations().subscribe({
      next: (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          try {
            this.recommendations = Array.isArray(rs.response?.recommendations)
              ? rs.response.recommendations
              : [];
            this.recommendations.forEach((r) => {
              r.selected = false;
              r.product_id = r.product_id || 0;
              r.current_stock = Number(r.current_stock) || 0;
              r.optimal_order_quantity = Number(r.optimal_order_quantity) || 0;
              r.estimated_cost = Number(r.estimated_cost) || 0;
              r.predicted_demand_7_days = Number(r.predicted_demand_7_days) || 0;
              r.predicted_demand_30_days = Number(r.predicted_demand_30_days) || 0;
              if (r.days_until_stockout !== null && r.days_until_stockout !== undefined) {
                r.days_until_stockout = Number(r.days_until_stockout);
                if (r.days_until_stockout >= 999) {
                  r.days_until_stockout = 999;
                }
              } else {
                r.days_until_stockout = 999;
              }
            });

            this.summary = {
              total_products_need_reorder: Number(rs.response?.summary?.total_products_need_reorder) || 0,
              high_urgency: Number(rs.response?.summary?.high_urgency) || 0,
              medium_urgency: Number(rs.response?.summary?.medium_urgency) || 0,
              low_urgency: Number(rs.response?.summary?.low_urgency) || 0,
              critical_urgency: Number(rs.response?.summary?.critical_urgency) || 0,
              total_estimated_cost: Number(rs.response?.summary?.total_estimated_cost) || 0,
            };

            this.updateChart();
            this.applyFilters();
          } catch (error) {
            console.error('Error processing recommendations:', error);
            this.showError('Lỗi khi xử lý dữ liệu đề xuất');
            this.recommendations = [];
            this.filteredRecommendations = [];
          }
        } else {
          const errorMsg = rs.response?.error_message_vn || rs.response?.error_message_us || 'Không thể tải dữ liệu';
          this.showError(errorMsg);
          this.recommendations = [];
          this.filteredRecommendations = [];
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Load recommendations error:', error);
        const errorMsg = error?.error?.response?.error_message_vn || error?.error?.response?.error_message_us || 'Lỗi hệ thống khi tải dữ liệu';
        this.showError(errorMsg);
        this.recommendations = [];
        this.filteredRecommendations = [];
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

    const hasData = urgencyData.some((val) => val > 0);

    this.chartData = {
      labels: ['Cực kỳ khẩn cấp', 'Khẩn cấp', 'Trung bình', 'Thấp'],
      datasets: [
        {
          data: hasData ? urgencyData : [0, 0, 0, 1],
          backgroundColor: ['#991b1b', '#ef4444', '#f59e0b', '#10b981'],
          hoverBackgroundColor: ['#7f1d1d', '#dc2626', '#d97706', '#059669'],
          borderWidth: 0,
        },
      ],
    };
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.recommendations];

    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.product_name.toLowerCase().includes(searchLower) ||
          r.product_sku.toLowerCase().includes(searchLower)
      );
    }

    if (this.selectedUrgency) {
      filtered = filtered.filter((r) => r.urgency === this.selectedUrgency);
    }

    this.filteredRecommendations = filtered;
    this.updateSelectAll();
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
      this.selectedProducts = this.selectedProducts.filter((p) => p.product_id !== item.product_id);
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

    const validProducts = this.selectedProducts.filter(r => {
      if (!r.product_id || r.product_id <= 0) {
        console.warn('Invalid product_id:', r);
        return false;
      }
      if (!r.optimal_order_quantity || r.optimal_order_quantity <= 0) {
        console.warn('Invalid optimal_order_quantity:', r);
        return false;
      }
      return true;
    });

    if (validProducts.length === 0) {
      this.showError('Không có sản phẩm hợp lệ để tạo đơn hàng');
      return;
    }

    const items = validProducts.map((r) => {
      const quantity = Math.max(1, Math.ceil(r.optimal_order_quantity));
      const costPrice = r.cost_price || (r.estimated_cost > 0 && r.optimal_order_quantity > 0
        ? r.estimated_cost / r.optimal_order_quantity
        : 0);

      return {
        product_id: r.product_id,
        product_name: r.product_name || 'Sản phẩm không tên',
        product_sku: r.product_sku || '',
        quantity: quantity,
        unit_price: Math.max(0, costPrice),
        unit: r.unit || 'cái',
        note: r.recommendation || '',
      };
    });

    const dialogRef = this.dialog.open(PurchaseOrderDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { items, fromAI: true },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.showSuccess('Đã tạo đơn đặt hàng thành công!');
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

    try {
      const exportData = this.filteredRecommendations.map((r, index) => ({
        STT: index + 1,
        'Sản phẩm': r.product_name || 'N/A',
        SKU: r.product_sku || 'N/A',
        'Độ ưu tiên': this.getUrgencyLabel(r.urgency || 'low'),
        'Tồn kho hiện tại': `${Number(r.current_stock) || 0} ${r.unit || 'cái'}`,
        'Hết hàng sau (ngày)': (r.days_until_stockout !== null && r.days_until_stockout !== undefined && r.days_until_stockout < 999) ? Number(r.days_until_stockout) : 'Không hết',
        'Nhu cầu 30 ngày': (Number(r.predicted_demand_30_days) || 0).toFixed(1),
        'Đề xuất nhập': `${Math.max(1, Math.ceil(Number(r.optimal_order_quantity) || 0))} ${r.unit || 'cái'}`,
        'Chi phí dự kiến (đ)': Number(r.estimated_cost) || 0,
        'Khuyến nghị': r.recommendation || 'Không có khuyến nghị',
      }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);

    const colWidths = [
      { wch: 5 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 50 },
    ];
    ws['!cols'] = colWidths;

      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'AI Recommendations');

      const fileName = `AI_Reorder_Recommendations_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      this.showSuccess(`Đã xuất file ${fileName}`);
    } catch (error) {
      console.error('Export Excel error:', error);
      this.showError('Có lỗi khi xuất file Excel');
    }
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
