import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthGuardService, TokenStorageService } from '../helpers/auth.interceptor';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

    constructor(
        private router: Router,
        private authGuardService: AuthGuardService
    ) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

        // Check if user is authenticated
        if (this.authGuardService.isAuthenticated()) {
            // User is logged in, allow access
            return true;
        }

        // User is not logged in, redirect to login page with return url
        console.warn('Unauthorized access attempt to:', state.url);
        this.router.navigate(['/auth/login'], {
            queryParams: { returnUrl: state.url }
        });
        return false;
    }
}

// Optional: Role-based guard for specific user types
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(
    private router: Router,
    private authGuardService: AuthGuardService,
    private tokenService: TokenStorageService
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {

    // Check if user is logged in
    if (!this.authGuardService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    // Extract required role(s)
    const requiredRole = route.data['role'];
    const userRole = this.tokenService.getUserRole();

    // Allow if user's role matches required role or list of roles
    if (Array.isArray(requiredRole)) {
      if (requiredRole.includes(userRole)) return true;
    } else if (userRole === requiredRole) {
      return true;
    }

    // Otherwise deny
    console.warn(`Access denied for role ${userRole}. Required: ${requiredRole}`);
    this.router.navigate(['/dashboard']); // or /access-denied
    return false;
  }
}
