import { Component, OnInit, OnDestroy } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { RouterOutlet } from '@angular/router';
import { WebSocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
  imports: [HeaderComponent, RouterOutlet],
  standalone: true,
})
export class PageComponent implements OnInit, OnDestroy {
  constructor(private wsService: WebSocketService) {}

  ngOnInit(): void {
    // Connect to WebSocket when user is authenticated
    this.wsService.connect();
  }

  ngOnDestroy(): void {
    // Disconnect WebSocket when component is destroyed
    this.wsService.disconnect();
  }
}
