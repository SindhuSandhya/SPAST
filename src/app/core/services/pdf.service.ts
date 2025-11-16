import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PdfViewerService {
    private apiUrl = 'http://35.154.101.131:8086/api/files/presigned-url';
    constructor(private http: HttpClient) { }

    getPresignedUrl(key: string): Observable<{ url: string }> {
        return this.http.get<{ url: string }>(`${this.apiUrl}?key=${encodeURIComponent(key)}`);
    }
}
