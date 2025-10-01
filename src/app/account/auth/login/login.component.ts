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
  error = '';
  loading = false;
  returnUrl: string;
  fieldTextType = false;

  // set the current year
  year: number = new Date().getFullYear();

  constructor(
    private formBuilder: UntypedFormBuilder, 
    private route: ActivatedRoute, 
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit() {
    // Check if user is already logged in
    if (this.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Get return url from route parameters or default to '/dashboard'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    // Initialize form with validation
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

  // Navigate to signup
  goToSignup() {
    this.router.navigate(['/auth/signup']);
  }

  // Convenience getter for easy access to form fields
  get f() { 
    return this.loginForm.controls; 
  }

  // Form submit
  onSubmit() {
    this.submitted = true;
    this.error = '';

    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      this.error = 'Please enter valid email and password.';
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
          // Check if user is active
          if (!response.data.active) {
            this.error = 'Your account is inactive. Please contact administrator.';
            return;
          }

          // Store authentication data
          this.storeAuthData(response.data);
          
          // Navigate to return URL or dashboard
          this.router.navigate([this.returnUrl]);
        } else {
          this.error = response.status.statusMessage || 'Login failed. Please try again.';
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Login error:', err);
        
        if (err.status === 401) {
          this.error = 'Invalid email or password. Please try again.';
        } else if (err.status === 403) {
          this.error = 'Your account is inactive. Please contact administrator.';
        } else if (err.error?.status?.statusMessage) {
          this.error = err.error.status.statusMessage;
        } else if (err.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Login failed. Please check your connection and try again.';
        }
      }
    });
  }

  // Store authentication data
  private storeAuthData(data: any) {
    // Generate a unique session ID
    const sessionId = this.generateSessionId();
    
    // Store in localStorage (persists across browser sessions)
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('loginTime', new Date().toISOString());

    // Store user data
    const userData = {
      id: data.id,
      userId: data.userId,
      fullName: data.fullName,
      tenantId: data.tenantId,
      emailId: data.emailId,
      mobile: data.mobile,
      userType: data.userType,
      active: data.active
    };
    localStorage.setItem('currentUser', JSON.stringify(userData));
    
    // Store session ID in sessionStorage (cleared when browser/tab closes)
    sessionStorage.setItem('activeSession', sessionId);
    
    // Store session info in localStorage for validation
    localStorage.setItem('lastSessionId', sessionId);
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Password Hide/Show toggle
  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  // Clear error when user starts typing
  onInputChange() {
    if (this.error) {
      this.error = '';
    }
  }
}