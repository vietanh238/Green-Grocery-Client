import { Component, OnInit } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { MatDialog } from '@angular/material/dialog';
import { AddProductDialog } from './addProductDialog/addProductDialog.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  imports: [Dialog, ButtonModule, InputTextModule],
})
export class ProductsComponent implements OnInit {
  constructor(private dialog: MatDialog) {}
  visible: boolean = false;

  ngOnInit(): void {}
  showDialog() {
    this.visible = true;
  }

  openAddProductDialog() {
    const dialogRef = this.dialog.open(AddProductDialog, {
      height: '400px',
      width: '600px',
    });
  }
}
