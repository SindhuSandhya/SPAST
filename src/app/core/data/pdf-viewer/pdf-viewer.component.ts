import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class PdfViewerComponent {
  // API endpoint to get presigned URL
  apiUrl = 'http://35.154.101.131:8086/api/files/presigned-url';

  // File key in S3
  @Input() fileKey = 'QZ2ONJ-^$Qdoq/Sasidhar_Report.pdf';

  presignedUrl: string = '';
  viewerUrl: SafeResourceUrl | null = null;
  currentViewer = 'google';
  isLoading = true;
  errorMessage = '';
  @Input() pdfUrl: string = '';

  viewerOptions = [
    { name: 'Google Docs', value: 'google' }
  ];

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) { }

  ngOnChanges() {
    this.getPresignedUrl();
  }

  getPresignedUrl() {
    this.isLoading = true;
    this.errorMessage = '';

    // Call API to get presigned URL
    const url = `${this.apiUrl}?key=${encodeURIComponent(this.fileKey)}`;

    this.http.get(url, { responseType: 'text' }).subscribe({
      next: (response: string) => {
        console.log('API Response:', response);

        // The API returns the presigned URL as plain text
        this.presignedUrl = response.trim();

        // Validate the URL
        if (this.presignedUrl && this.presignedUrl.startsWith('http')) {
          console.log('Presigned URL received:', this.presignedUrl);
          this.loadWithViewer(this.currentViewer);
        } else {
          this.errorMessage = 'Invalid presigned URL received from API';
          console.error('Invalid URL:', this.presignedUrl);
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error getting presigned URL:', error);
        this.errorMessage = `Failed to get presigned URL: ${error.message || 'Network error'}`;
        this.isLoading = false;
      }
    });
  }

  loadWithViewer(viewer: string) {
    if (!this.presignedUrl) {
      this.errorMessage = 'No presigned URL available';
      return;
    }

    this.currentViewer = viewer;
    let url = '';

    switch (viewer) {
      case 'mozilla':
        // Mozilla PDF.js viewer (most reliable)
        url = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(this.presignedUrl)}`;
        break;

      case 'google':
        // Google Docs Viewer
        url = `https://docs.google.com/gview?url=${encodeURIComponent(this.presignedUrl)}&embedded=true`;
        break;

      case 'office':
        // Office 365 Viewer
        url = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(this.presignedUrl)}`;
        break;

      case 'direct':
        // Direct URL for ngx-doc-viewer
        url = this.presignedUrl;
        break;
    }

    this.viewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.isLoading = false;
  }

  onViewerChange(event: any) {
    this.loadWithViewer(event.target.value);
  }

  retryLoad() {
    this.getPresignedUrl();
  }
}