import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { Observable, map, catchError, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class DuplicateCheckService {
  constructor(private http: HttpClient) {}

  checkPhoneNumber(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value || control.value.length < 10) {
      return of(null);
    }

    // Add debounce to avoid too many API calls
    return timer(300).pipe(
      switchMap(() => 
        this.http.get<any>(`${environment.apiUrl}/tenant/contactPhoneNumberExists`, {
          params: { contactPhoneNumber: control.value }
        }).pipe(
          map((response) => {
            console.log('Phone check response:', response); // Debug log
            
            // Handle different response structures
            const exists = response === true || response.data === true || response.exists === true;
            return exists ? { phoneExists: true } : null;
          }),
          catchError((error) => {
            console.error('Phone check error:', error); // Debug log
            return of(null); // Don't show error for network issues
          })
        )
      )
    );
  }

  checkGst(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value || control.value.length < 15) {
      return of(null);
    }

    return timer(300).pipe(
      switchMap(() =>
        this.http.get<any>(`${environment.apiUrl}/tenant/gstNoExists`, {
          params: { gstNo: control.value }
        }).pipe(
          map((response) => {
            console.log('GST check response:', response); // Debug log
            
            const exists = response === true || response.data === true || response.exists === true;
            return exists ? { gstExists: true } : null;
          }),
          catchError((error) => {
            console.error('GST check error:', error); // Debug log
            return of(null);
          })
        )
      )
    );
  }

  checkEmail(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value || !control.value.includes('@')) {
      return of(null);
    }

    return timer(300).pipe(
      switchMap(() =>
        this.http.get<any>(`${environment.apiUrl}/tenant/contactEmailExists`, {
          params: { contactEmail: control.value }
        }).pipe(
          map((response) => {
            console.log('Email check response:', response); // Debug log
            
            const exists = response === true || response.data === true || response.exists === true;
            return exists ? { emailExists: true } : null;
          }),
          catchError((error) => {
            console.error('Email check error:', error); // Debug log
            return of(null);
          })
        )
      )
    );
  }
}