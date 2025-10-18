import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface LoginResponse {
  id: string | null;
  status: {
    statusCode: number;
    statusMessage: string;
  };
  errors: any;
  data: {
    id: string;
    userId: string;
    fullName: string;
    tenantId: string;
    emailId: string;
    mobile: string;
    userType: string;
    active: boolean;
    createdBy: string;
    createdOn: string;
    updatedBy: string;
    updatedOn: string;
  };
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class LoginComponent implements OnInit {
  loginForm: UntypedFormGroup;
  submitted = false;
  loading = false;
  returnUrl: string;
  fieldTextType = false;

  // modal control
  showErrorModal = false;
  errorTitle = '';
  errorMessage = '';

  year: number = new Date().getFullYear();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    if (this.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const user = localStorage.getItem('currentUser');
    const sessionId = sessionStorage.getItem('activeSession');
    return !!(isLoggedIn === 'true' && user && sessionId);
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit() {
    this.submitted = true;

    if (this.loginForm.invalid) {
      this.openErrorModal('Validation Error', 'Please enter a valid email and password.');
      return;
    }

    this.loading = true;
    const loginData = {
      userEmail: this.f['email'].value,
      password: this.f['password'].value
    };

    this.http.post<LoginResponse>(`${environment.apiUrl}/user/login`, loginData).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.status.statusCode === 112 && response.data) {
          if (!response.data.active) {
            this.openErrorModal('Account Inactive', 'Your account is inactive. Please contact the administrator.');
            return;
          }

          this.storeAuthData(response.data);
          this.router.navigate([this.returnUrl]);
        } else {
          this.openErrorModal('Login Failed', response.status.statusMessage || 'Unable to login. Please try again.');
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Login error:', err);

        if (err.status === 401) {
          this.openErrorModal('Invalid Credentials', 'Incorrect email or password. Please try again.');
        } else if (err.status === 403) {
          this.openErrorModal('Account Inactive', 'Your account is inactive. Please contact the administrator.');
        } else if (err.error?.status?.statusMessage) {
          this.openErrorModal('Error', err.error.status.statusMessage);
        } else {
          this.openErrorModal('Connection Error', 'Login failed. Please check your internet connection and try again.');
        }
      }
    });
  }

  private openErrorModal(title: string, message: string) {
    this.errorTitle = title;
    this.errorMessage = message;
    this.showErrorModal = true;
  }

  private storeAuthData(data: any) {
    const sessionId = this.generateSessionId();
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('userRole', data.userType);
    localStorage.setItem('loginTime', new Date().toISOString());
    localStorage.setItem('currentUser', JSON.stringify(data));
    sessionStorage.setItem('activeSession', sessionId);
    localStorage.setItem('lastSessionId', sessionId);
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }
}
