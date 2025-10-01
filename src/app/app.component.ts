import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationStart, RouterModule } from '@angular/router';
import { AuthGuardService } from './core/helpers/auth.interceptor';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
   imports: [RouterModule] // Uncomment if RouterModule is needed
})
export class AppComponent implements OnInit, OnDestroy {
  
  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private authGuardService: AuthGuardService
  ) {
    // Prevent back button navigation after logout
    this.preventBackButtonAfterLogout();
  }

  ngOnInit(): void {
    // Check authentication on every navigation
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        // Check if trying to access protected route
        const isAuthRoute = event.url.includes('/auth/');
        
        if (!isAuthRoute && !this.authGuardService.isAuthenticated()) {
          // User is not authenticated, redirect to login
          this.router.navigate(['/auth/login'], {
            queryParams: { returnUrl: event.url }
          });
        }
      }
    });

    // Listen for browser back/forward button
    window.addEventListener('popstate', this.handlePopState.bind(this));
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    window.removeEventListener('popstate', this.handlePopState.bind(this));
  }

  // Handle browser back/forward button
  private handlePopState(event: PopStateEvent): void {
    const currentUrl = window.location.pathname;
    const isAuthRoute = currentUrl.includes('/auth/');
    
    if (!isAuthRoute && !this.authGuardService.isAuthenticated()) {
      // User is not authenticated, redirect to login
      this.router.navigate(['/auth/login']);
    }
  }

  // Prevent back button navigation after logout
  private preventBackButtonAfterLogout(): void {
    history.pushState(null, '', location.href);
    
    window.addEventListener('popstate', () => {
      if (!this.authGuardService.isAuthenticated()) {
        history.pushState(null, '', location.href);
        this.router.navigate(['/auth/login']);
      }
    });
  }
}