import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface Product {
  id?: number;
  name: string;
  sku: string;
  bar_code?: string;
  name_category: string;
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

@Component({
  selector: 'app-product-detail-dialog',
  templateUrl: './producDetailDialog.component.html',
  styleUrl: './producDetailDialog.component.scss',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  standalone: true,
})
export class ProductDetailDialogComponent {
  product: Product;

  constructor(
    public dialogRef: MatDialogRef<ProductDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.product = data.product;
  }

  close(): void {
    this.dialogRef.close();
  }

  onImageError(event: any): void {
    const element = event.target as HTMLImageElement;
    element.src = 'assets/placeholder-product.png';
    element.onerror = null;
  }

  get profit(): number {
    return this.product.price - this.product.cost_price;
  }

  get profitMargin(): string {
    if (this.product.cost_price === 0) return '0';
    const margin = ((this.product.price - this.product.cost_price) / this.product.cost_price) * 100;
    return margin.toFixed(2);
  }

  getStockStatus(): string {
    if (this.product.stock_quantity === 0) return 'Hết hàng';
    if (this.product.is_overstock) return 'Vượt tồn kho';
    if (this.product.is_reorder) return 'Sắp hết hàng';
    return 'Còn hàng';
  }

  getStockStatusClass(): string {
    if (this.product.stock_quantity === 0) return 'status-danger';
    if (this.product.is_overstock) return 'status-info';
    if (this.product.is_reorder) return 'status-warning';
    return 'status-success';
  }

  getStockStatusIcon(): string {
    if (this.product.stock_quantity === 0) return 'pi pi-times-circle';
    if (this.product.is_overstock) return 'pi pi-arrow-up';
    if (this.product.is_reorder) return 'pi pi-exclamation-triangle';
    return 'pi pi-check-circle';
  }
}
