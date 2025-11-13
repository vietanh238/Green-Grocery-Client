import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

/**
 * Enum định nghĩa các trạng thái của scanner
 */
enum ScannerState {
  INITIALIZING = 'initializing',
  READY = 'ready',
  SCANNING = 'scanning',
  ERROR = 'error',
  PERMISSION_DENIED = 'permission_denied',
  NO_CAMERA = 'no_camera',
}

/**
 * Interface cho error state
 */
interface ScannerError {
  type: ScannerState;
  message: string;
  canRetry: boolean;
}

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrl: './scanner.component.scss',
  standalone: true,
  imports: [CommonModule],
})
export class ScannerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('video', { static: false }) video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cameraWrapper', { static: false }) cameraWrapper!: ElementRef<HTMLDivElement>;

  // Scanner properties
  private codeReader: BrowserMultiFormatReader;
  private currentStream: MediaStream | null = null;
  private currentDeviceId: string | null = null;
  private availableDevices: MediaDeviceInfo[] = [];
  private scanTimeout: any = null;

  // UI State
  currentState: ScannerState = ScannerState.INITIALIZING;
  lastScannedCode: string = '';
  hasFlash: boolean = false;
  flashOn: boolean = false;
  hasMultipleCameras: boolean = false;
  isScanning: boolean = false;
  error: ScannerError | null = null;

  // Expose enum to template
  readonly ScannerState = ScannerState;

  constructor(private dialogRef: MatDialogRef<ScannerComponent>, private cdr: ChangeDetectorRef) {
    this.codeReader = new BrowserMultiFormatReader();
  }

  ngOnInit(): void {
    // Chỉ khởi tạo codeReader, chưa start camera
    console.log('Scanner initialized');
  }

  ngAfterViewInit(): void {
    // Đảm bảo view đã render xong mới start camera
    setTimeout(() => {
      this.initializeScanner();
    }, 100);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Khởi tạo scanner và request permissions
   */
  private async initializeScanner(): Promise<void> {
    try {
      this.currentState = ScannerState.INITIALIZING;
      this.cdr.detectChanges();

      // Bước 1: Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.handleError({
          type: ScannerState.ERROR,
          message: 'Trình duyệt không hỗ trợ camera',
          canRetry: false,
        });
        return;
      }

      // Bước 2: Request camera permission
      const permissionGranted = await this.requestCameraPermission();
      if (!permissionGranted) {
        return;
      }

      // Bước 3: Lấy danh sách devices
      this.availableDevices = await this.codeReader.listVideoInputDevices();

      if (this.availableDevices.length === 0) {
        this.handleError({
          type: ScannerState.NO_CAMERA,
          message: 'Không tìm thấy camera',
          canRetry: true,
        });
        return;
      }

      this.hasMultipleCameras = this.availableDevices.length > 1;

      // Bước 4: Chọn camera phù hợp
      const selectedDevice = this.selectBestCamera();
      if (!selectedDevice) {
        this.handleError({
          type: ScannerState.NO_CAMERA,
          message: 'Không thể chọn camera',
          canRetry: true,
        });
        return;
      }

      this.currentDeviceId = selectedDevice.deviceId;

      // Bước 5: Start scanning
      await this.startScanning(this.currentDeviceId);

      // Bước 6: Check flash support
      await this.checkFlashSupport();

      this.currentState = ScannerState.READY;
      this.cdr.detectChanges();
    } catch (error: any) {
      console.error('Error initializing scanner:', error);
      this.handleError({
        type: ScannerState.ERROR,
        message: this.getErrorMessage(error),
        canRetry: true,
      });
    }
  }

  /**
   * Request camera permission
   */
  private async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera
        },
        audio: false,
      });

      // Stop stream ngay sau khi có permission
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error: any) {
      console.error('Permission denied:', error);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.handleError({
          type: ScannerState.PERMISSION_DENIED,
          message: 'Vui lòng cấp quyền truy cập camera',
          canRetry: false,
        });
      } else {
        this.handleError({
          type: ScannerState.ERROR,
          message: 'Không thể truy cập camera',
          canRetry: true,
        });
      }

      return false;
    }
  }

  /**
   * Chọn camera tốt nhất (ưu tiên camera sau)
   */
  private selectBestCamera(): MediaDeviceInfo | null {
    if (this.availableDevices.length === 0) return null;

    // Tìm camera sau
    const backCamera = this.availableDevices.find((device) => {
      const label = device.label.toLowerCase();
      return (
        label.includes('back') ||
        label.includes('rear') ||
        label.includes('environment') ||
        label.includes('后置') || // Chinese
        label.includes('trasera') // Spanish
      );
    });

    return backCamera || this.availableDevices[0];
  }

  /**
   * Bắt đầu quét mã
   */
  private async startScanning(deviceId: string): Promise<void> {
    try {
      // Đảm bảo video element đã sẵn sàng
      if (!this.video?.nativeElement) {
        throw new Error('Video element not ready');
      }

      this.isScanning = true;
      this.currentState = ScannerState.SCANNING;

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

      // Lưu stream reference
      this.currentStream = this.video.nativeElement.srcObject as MediaStream;

      // Verify stream is active
      if (!this.currentStream || !this.currentStream.active) {
        throw new Error('Stream not active');
      }

      this.cdr.detectChanges();
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      this.isScanning = false;
      this.currentState = ScannerState.ERROR;

      this.handleError({
        type: ScannerState.ERROR,
        message: 'Không thể khởi động camera',
        canRetry: true,
      });
    }
  }

  /**
   * Xử lý khi quét thành công
   */
  private handleScanSuccess(code: string): void {
    if (!code || code === this.lastScannedCode) return;

    this.lastScannedCode = code;
    this.currentState = ScannerState.READY;

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Play beep sound if needed
    this.playBeepSound();

    this.cdr.detectChanges();

    // Auto close sau 500ms
    this.scanTimeout = setTimeout(() => {
      this.closeScanner(code);
    }, 500);
  }

  /**
   * Play beep sound khi scan thành công
   */
  private playBeepSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Could not play beep sound:', error);
    }
  }

  /**
   * Check flash support
   */
  private async checkFlashSupport(): Promise<void> {
    if (!this.currentStream) return;

    try {
      const track = this.currentStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      this.hasFlash = 'torch' in capabilities;
      this.cdr.detectChanges();
    } catch (error) {
      console.warn('Could not check flash support:', error);
      this.hasFlash = false;
    }
  }

  /**
   * Toggle flash/torch
   */
  async toggleFlash(): Promise<void> {
    if (!this.currentStream || !this.hasFlash) return;

    try {
      const track = this.currentStream.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{ torch: !this.flashOn } as any],
      });
      this.flashOn = !this.flashOn;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error toggling flash:', error);
    }
  }

  /**
   * Switch camera
   */
  async switchCamera(): Promise<void> {
    if (!this.hasMultipleCameras || !this.currentDeviceId) return;

    try {
      const currentIndex = this.availableDevices.findIndex(
        (device) => device.deviceId === this.currentDeviceId
      );
      const nextIndex = (currentIndex + 1) % this.availableDevices.length;
      const nextDevice = this.availableDevices[nextIndex];

      if (!nextDevice) return;

      this.stopScanner();
      this.currentDeviceId = nextDevice.deviceId;
      await this.startScanning(this.currentDeviceId);
      await this.checkFlashSupport();
    } catch (error) {
      console.error('Error switching camera:', error);
      this.handleError({
        type: ScannerState.ERROR,
        message: 'Không thể chuyển camera',
        canRetry: true,
      });
    }
  }

  /**
   * Retry initialization
   */
  async retryInitialization(): Promise<void> {
    this.error = null;
    this.currentState = ScannerState.INITIALIZING;
    this.cdr.detectChanges();
    await this.initializeScanner();
  }

  /**
   * Stop scanner
   */
  private stopScanner(): void {
    try {
      // Turn off flash if on
      if (this.flashOn && this.currentStream) {
        const track = this.currentStream.getVideoTracks()[0];
        track
          .applyConstraints({
            advanced: [{ torch: false } as any],
          })
          .catch(() => {});
        this.flashOn = false;
      }

      // Reset code reader
      this.codeReader.reset();

      // Stop all tracks
      if (this.currentStream) {
        this.currentStream.getTracks().forEach((track) => {
          track.stop();
        });
        this.currentStream = null;
      }

      this.isScanning = false;
    } catch (error) {
      console.error('Error stopping scanner:', error);
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }
    this.stopScanner();
  }

  /**
   * Handle errors
   */
  private handleError(error: ScannerError): void {
    this.error = error;
    this.currentState = error.type;
    this.isScanning = false;
    this.cdr.detectChanges();
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Vui lòng cấp quyền truy cập camera';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'Không tìm thấy camera';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'Camera đang được sử dụng bởi ứng dụng khác';
    }
    if (error.name === 'OverconstrainedError') {
      return 'Camera không đáp ứng yêu cầu';
    }
    if (error.name === 'SecurityError') {
      return 'Kết nối không an toàn. Vui lòng sử dụng HTTPS';
    }
    return error.message || 'Đã xảy ra lỗi không xác định';
  }

  /**
   * Close scanner dialog
   */
  closeScanner(code?: string): void {
    this.cleanup();
    this.dialogRef.close(code ? [code] : null);
  }

  /**
   * Open settings để user cấp quyền
   */
  openSettings(): void {
    alert(
      'Vui lòng vào Cài đặt > Quyền riêng tư > Camera để cấp quyền truy cập camera cho trang web này.'
    );
  }
}
