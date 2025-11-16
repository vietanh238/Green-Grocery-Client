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
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';

interface ReorderRecommendation {
  product_id: number;
  product_name: string;
  product_sku: string;
  current_stock: number;
  urgency: 'high' | 'medium' | 'low';
  reorder_point: number;
  optimal_order_quantity: number;
  predicted_demand_7_days: number;
  predicted_demand_30_days: number;
  days_until_stockout: number;
  estimated_cost: number;
  recommendation: string;
  unit: string;
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
  ],
  providers: [MessageService],
})
export class AiReorderComponent implements OnInit {
  recommendations: ReorderRecommendation[] = [];
  loading: boolean = false;
  trainingAI: boolean = false;

  summary = {
    total_products_need_reorder: 0,
    high_urgency: 0,
    medium_urgency: 0,
    low_urgency: 0,
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
            font: { size: 12 },
            usePointStyle: true,
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
          this.summary = rs.response.summary || this.summary;
          this.updateChart();
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
      this.summary.high_urgency,
      this.summary.medium_urgency,
      this.summary.low_urgency,
    ];

    this.chartData = {
      labels: ['Khẩn cấp', 'Trung bình', 'Thấp'],
      datasets: [
        {
          data: urgencyData,
          backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
          hoverBackgroundColor: ['#dc2626', '#d97706', '#16a34a'],
        },
      ],
    };
  }

  getUrgencyLabel(urgency: string): string {
    const labels: { [key: string]: string } = {
      high: 'Khẩn cấp',
      medium: 'Trung bình',
      low: 'Thấp',
    };
    return labels[urgency] || urgency;
  }

  getUrgencySeverity(urgency: string): 'danger' | 'warn' | 'success' {
    const severities: { [key: string]: 'danger' | 'warn' | 'success' } = {
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

  viewForecast(productId: number): void {
    console.log('View forecast for product:', productId);
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
