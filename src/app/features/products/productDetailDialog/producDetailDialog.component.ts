import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
    element.onerror = null;
  }

  get profit(): number {
    return this.product.price - this.product.cost_price;
  }
}
