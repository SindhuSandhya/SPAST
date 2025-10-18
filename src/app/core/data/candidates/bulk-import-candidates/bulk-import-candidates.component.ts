import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-bulk-import-candidates',
  templateUrl: './bulk-import-candidates.component.html',
  styleUrls: ['./bulk-import-candidates.component.css'],
  standalone: true,
  imports: [CommonModule,FormsModule, ReactiveFormsModule, HttpClientModule]
})
export class BulkImportCandidatesComponent {
  @Output() importSuccess = new EventEmitter<File | string | null>();

  selectedExcelFile: File | null = null;
  selectedZipFile: File | null = null;
  importError: string = '';

  // Zip upload state
  zipUploading = false;
  uploadProgress = 0; // 0-100
  uploadedZipFileName = '';

  constructor(private http: HttpClient) {}

  onFileChange(event: any, type?: string) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      console.log('No file selected');
      return;
    }

    if (type === 'excel') {
      this.selectedExcelFile = file;
      console.log('Excel file selected: ', file);
    } else if (type === 'zip') {
      this.selectedZipFile = file;
      console.log('Zip file selected: ', file);
      // start upload immediately and show progress
      this.uploadedZipFileName = '';
      this.uploadZipFile(file);
    } else {
      this.selectedExcelFile = file;
      console.log('File selected: ', file);
    }
  }

  validateUploads() {
    this.importError = '';
    // Emit the excel file to parent for bulk import; emit null if none selected
    if (this.selectedExcelFile) {
      this.importSuccess.emit(this.selectedExcelFile);
    } else {
      this.importSuccess.emit(null);
    }
  }

  uploadZipFile(file: File) {
    this.zipUploading = true;
    this.uploadProgress = 0;
    this.importError = '';

    const tenantId = 'O9HG0W';
    const formData = new FormData();
    formData.append('file', file, file.name);

    this.http.post(`${environment.apiUrl}/candidates/bulkUpload?tenantId=${tenantId}`, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          const percentDone = Math.round(100 * (event.loaded / (event.total || file.size)));
          this.uploadProgress = percentDone;
        } else if (event.type === HttpEventType.Response) {
          this.zipUploading = false;
          this.uploadProgress = 100;
          this.uploadedZipFileName = file.name;
          console.log('Zip upload response:', event.body);
        }
      },
      error: (err) => {
        this.zipUploading = false;
        this.uploadProgress = 0;
        this.importError = err?.error?.message || 'Failed to upload zip file.';
        console.error('Zip upload error:', err);
      }
    });
  }

  removeUploadedZip() {
    this.selectedZipFile = null;
    this.uploadedZipFileName = '';
    this.uploadProgress = 0;
    this.zipUploading = false;
    this.importError = '';
  }

}
