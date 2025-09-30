import { Component, OnInit } from '@angular/core';
import { PanelModule } from 'primeng/panel';
import { InputGroup } from 'primeng/inputgroup';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

@Component({
  selector: 'app-sell',
  templateUrl: './sell.component.html',
  styleUrl: './sell.component.scss',
  standalone: true,
  imports: [PanelModule, InputGroup, ButtonModule, FormsModule, InputGroupAddonModule],
})
export class SellComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
