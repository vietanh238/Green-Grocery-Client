import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { Service } from '../../../core/services/service';
import { ConstantDef } from '../../../core/constanDef';

@Component({
  selector: 'app-forecast-detail-dialog',
  templateUrl: './forecast-detail-dialog.component.html',
  styleUrl: './forecast-detail-dialog.component.scss',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, ChartModule, CardModule],
})
export class ForecastDetailDialogComponent implements OnInit {
  recommendation: any;
  forecastData: any[] = [];
  loading: boolean = false;
  chartData: any;
  chartOptions: any;

  constructor(
    public dialogRef: MatDialogRef<ForecastDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private service: Service
  ) {
    this.recommendation = data.recommendation;
  }

  ngOnInit(): void {
    this.initializeChart();
    this.loadForecast();
  }

  initializeChart(): void {
    this.chartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#1f2937',
            font: { size: 12 },
            usePointStyle: true,
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#6b7280',
            font: { size: 11 },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f3f4f6',
          },
          ticks: {
            color: '#6b7280',
            font: { size: 11 },
          },
        },
      },
    };
  }

  loadForecast(): void {
    this.loading = true;

    this.service.getProductForecast(this.recommendation.product_id).subscribe({
      next: (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.forecastData = rs.response.predictions || [];
          this.updateChart();
        }
      },
      error: (_error: any) => {
        this.loading = false;
      },
    });
  }

  updateChart(): void {
    const labels = this.forecastData.map((d) => {
      const date = new Date(d.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const predictions = this.forecastData.map((d) => d.predicted_quantity);

    // Calculate cumulative demand
    let cumulative = 0;
    const cumulativeDemand = predictions.map((val) => {
      cumulative += val;
      return cumulative;
    });

    // Stock level projection
    const currentStock = this.recommendation.current_stock;
    let stock = currentStock;
    const stockLevels = predictions.map((val) => {
      stock = Math.max(0, stock - val);
      return stock;
    });

    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Dự đoán nhu cầu hàng ngày',
          data: predictions,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Tồn kho dự kiến',
          data: stockLevels,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Nhu cầu tích lũy',
          data: cumulativeDemand,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true,
          hidden: true,
        },
      ],
    };
  }

  close(): void {
    this.dialogRef.close();
  }

  getUrgencyClass(): string {
    switch (this.recommendation.urgency) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'info';
    }
  }

  getUrgencyLabel(): string {
    switch (this.recommendation.urgency) {
      case 'high':
        return 'Khẩn cấp';
      case 'medium':
        return 'Trung bình';
      case 'low':
        return 'Thấp';
      default:
        return 'Không xác định';
    }
  }
}




