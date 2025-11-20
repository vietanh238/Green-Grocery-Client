import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Service } from './service';
import { URL_SERVER } from '../../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<any>();
  public message$ = this.messageSubject.asObservable();

  private paymentSuccessSubject = new Subject<any>();
  public paymentSuccess$ = this.paymentSuccessSubject.asObservable();

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private isConnecting = false;

  constructor(private service: Service) {}

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = this.getWebSocketUrl();

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.socket = null;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.isConnecting = false;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
  }

  private handleMessage(data: any): void {
    console.log('WebSocket message received:', data);

    this.messageSubject.next(data);

    if (data.message_type === 'payment_success') {
      this.paymentSuccessSubject.next({
        success: true,
        data: data.data,
      });
      this.service.notifyPaymentSuccess(data.data);
    } else if (data.message_type === 'remind_reorder') {
      console.log('Reorder reminder:', data.data);
    }
  }

  private getWebSocketUrl(): string {
    // Use server URL from environment
    const serverUrl = URL_SERVER.replace('https://', '').replace('http://', '');
    const protocol = URL_SERVER.startsWith('https') ? 'wss:' : 'ws:';
    return `${protocol}//${serverUrl}/ws/message/`;
  }

  sendMessage(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
