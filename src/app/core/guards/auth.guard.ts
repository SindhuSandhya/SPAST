import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthGuardService } from '../helpers/auth.interceptor';

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
        private authGuardService: AuthGuardService
    ) { }

    canActivate(
        route: ActivatedRouteSnapshot, 
        state: RouterStateSnapshot
    ): boolean {
        
        // Check if user is authenticated first
        if (!this.authGuardService.isAuthenticated()) {
            this.router.navigate(['/auth/login'], { 
                queryParams: { returnUrl: state.url } 
            });
            return false;
        }

        // Check for required role (if specified in route data)
        const requiredRole = route.data['role'];
        if (requiredRole) {
            const hasRole = this.authGuardService.hasRole(requiredRole);
            if (!hasRole) {
                console.warn('Access denied: User does not have required role');
                this.router.navigate(['/dashboard']); // Redirect to dashboard or access denied page
                return false;
            }
        }

        return true;
    }
}