import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrl: './scanner.component.scss',
  standalone: true,
  imports: [CommonModule],
})
export class ScannerComponent implements OnInit, OnDestroy {
  @ViewChild('video', { static: false }) video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cameraWrapper', { static: false }) cameraWrapper!: ElementRef<HTMLDivElement>;

  private codeReader: BrowserMultiFormatReader;
  private currentStream: MediaStream | null = null;
  private currentDeviceId: string | null = null;
  private availableDevices: MediaDeviceInfo[] = [];

  lastScannedCode: string = '';
  hasFlash: boolean = false;
  flashOn: boolean = false;
  hasMultipleCameras: boolean = false;
  isScanning: boolean = false;

  constructor(private dialogRef: MatDialogRef<ScannerComponent>) {
    this.codeReader = new BrowserMultiFormatReader();
  }

  ngOnInit(): void {
    this.initializeScanner();
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  private async initializeScanner(): Promise<void> {
    try {
      this.availableDevices = await this.codeReader.listVideoInputDevices();
      this.hasMultipleCameras = this.availableDevices.length > 1;

      const backCamera = this.availableDevices.find(
        (device) =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
      );

      this.currentDeviceId = backCamera ? backCamera.deviceId : this.availableDevices[0]?.deviceId;

      if (this.currentDeviceId) {
        await this.startScanning(this.currentDeviceId);
        await this.checkFlashSupport();
      }
    } catch (error) {
      console.error('Error initializing scanner:', error);
    }
  }

  private async startScanning(deviceId: string): Promise<void> {
    try {
      this.isScanning = true;

      await this.codeReader.decodeFromVideoDevice(
        deviceId,
        this.video.nativeElement,
        (result, error) => {
          if (result) {
            this.handleScanSuccess(result.getText());
          }
          if (error && !(error instanceof NotFoundException)) {
            console.error('Scan error:', error);
          }
        }
      );

      this.currentStream = this.video.nativeElement.srcObject as MediaStream;
    } catch (error) {
      console.error('Error starting scanner:', error);
      this.isScanning = false;
    }
  }

  private handleScanSuccess(code: string): void {
    if (code && code !== this.lastScannedCode) {
      this.lastScannedCode = code;

      navigator.vibrate?.(200);

      setTimeout(() => {
        this.closeScanner(code);
      }, 500);
    }
  }

  private async checkFlashSupport(): Promise<void> {
    if (this.currentStream) {
      const track = this.currentStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      this.hasFlash = 'torch' in capabilities;
    }
  }

  async toggleFlash(): Promise<void> {
    if (!this.currentStream || !this.hasFlash) return;

    try {
      const track = this.currentStream.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{ torch: !this.flashOn } as any],
      });
      this.flashOn = !this.flashOn;
    } catch (error) {
      console.error('Error toggling flash:', error);
    }
  }

  async switchCamera(): Promise<void> {
    if (!this.hasMultipleCameras) return;

    const currentIndex = this.availableDevices.findIndex(
      (device) => device.deviceId === this.currentDeviceId
    );
    const nextIndex = (currentIndex + 1) % this.availableDevices.length;
    const nextDevice = this.availableDevices[nextIndex];

    if (nextDevice) {
      this.stopScanner();
      this.currentDeviceId = nextDevice.deviceId;
      await this.startScanning(this.currentDeviceId);
      await this.checkFlashSupport();
    }
  }

  private stopScanner(): void {
    if (this.flashOn) {
      this.toggleFlash();
    }

    this.codeReader.reset();

    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }

    this.isScanning = false;
  }

  closeScanner(code?: string): void {
    this.stopScanner();
    this.dialogRef.close(code ? [code] : null);
  }
}
