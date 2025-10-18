import { HTTP_INTERCEPTORS, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authReq = req;
    const userId = this.getUserId();

    // Add userId header if user is authenticated and endpoint is not public
    if (userId && !this.isPublicEndpoint(req.url)) {
      authReq = req.clone({
        setHeaders: {
          'X-User-Id': userId,
          'Content-Type': 'application/json'
        }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle authentication errors
        if (error.status === 401) {
          this.handleUnauthorized();
        } else if (error.status === 403) {
          console.warn('Access denied:', error.message);
        }
        return throwError(() => error);
      })
    );
  }

  // Get userId from localStorage
  private getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  // Check if endpoint is public (doesn't require authentication)
  private isPublicEndpoint(url: string): boolean {
    const publicEndpoints = [
      '/user/login',
      '/tenant/createTenant',
      '/user/createUser',
      '/tenant/gstNoExists',
      '/tenant/contactEmailExists',
      '/tenant/contactPhoneNumberExists'
    ];

    return publicEndpoints.some(endpoint => url.includes(endpoint));
  }

  // Handle unauthorized access
  private handleUnauthorized(): void {
    // Clear stored authentication data
    this.clearAuthData();

    // Redirect to login page
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  // Clear all authentication data
  private clearAuthData(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('lastSessionId');
    sessionStorage.clear();
  }
}

// Auth Guard Service
@Injectable({
  providedIn: 'root'
})
export class AuthGuardService {

  constructor(private router: Router) {
    // Listen for storage events (logout in another tab)
    this.setupStorageListener();
  }

  canActivate(): boolean {
    if (this.isAuthenticated()) {
      return true;
    } else {
      this.router.navigate(['/auth/login']);
      return false;
    }
  }

  isAuthenticated(): boolean {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const user = localStorage.getItem('currentUser');
    const userId = localStorage.getItem('userId');
    const activeSession = sessionStorage.getItem('activeSession');
    const lastSessionId = localStorage.getItem('lastSessionId');

    // Check if all required data exists
    if (isLoggedIn !== 'true' || !user || !userId) {
      this.clearAuthData();
      return false;
    }

    // Check if session is active (prevents back button after logout)
    if (!activeSession || activeSession !== lastSessionId) {
      this.clearAuthData();
      return false;
    }

    // Validate user data
    try {
      const userData = JSON.parse(user);
      if (!userData.active) {
        this.clearAuthData();
        return false;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      this.clearAuthData();
      return false;
    }

    return true;
  }

  // Listen for storage changes (e.g., logout in another tab)
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === 'isLoggedIn' && event.newValue !== 'true') {
        // User logged out in another tab
        this.clearAuthData();
        this.router.navigate(['/auth/login']);
      }
    });
  }

  // Get current user data
  getCurrentUser(): any {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Get user ID
  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  // Get user role/type
  getUserType(): string {
    const user = this.getCurrentUser();
    return user ? user.userType : '';
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    return this.getUserType() === role;
  }

  // Logout user
  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  // Clear authentication data
  private clearAuthData(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('lastSessionId');
    sessionStorage.clear();
  }
}

// Token Storage Service (adapted for non-token authentication)
@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {

  private readonly USER_ID_KEY = 'userId';
  private readonly USER_KEY = 'currentUser';
  private readonly LOGIN_FLAG_KEY = 'isLoggedIn';

  // Clear all stored data
  signOut(): void {
    localStorage.clear();
    sessionStorage.clear();
  }

  // Save userId
  public saveUserId(userId: string): void {
    localStorage.setItem(this.USER_ID_KEY, userId);
  }

  // Get userId
  public getUserId(): string | null {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  // Save user data
  public saveUser(user: any): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.LOGIN_FLAG_KEY, 'true');
  }

  // Get user data
  public getUser(): any {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  // Check if logged in
  public isLoggedIn(): boolean {
    const isLoggedIn = localStorage.getItem(this.LOGIN_FLAG_KEY);
    const activeSession = sessionStorage.getItem('activeSession');
    return isLoggedIn === 'true' && !!activeSession;
  }

  // Get user role from localStorage
  getUserRole(): string {
    return localStorage.getItem('userRole') || '';
  }

  // Check if current user has the required role
  hasRole(requiredRole: string): boolean {
    const role = this.getUserRole();
    return role === requiredRole;
  }
}



// Export provider
export const authInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
];