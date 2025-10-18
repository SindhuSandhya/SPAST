import { Component, OnInit, Output, EventEmitter, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AuthenticationService } from '../../core/services/auth.service';
import { AuthfakeauthenticationService } from '../../core/services/authfake.service';
import { AuthGuardService } from '../../core/helpers/auth.interceptor';
import { environment } from '../../../environments/environment';
import { CookieService } from 'ngx-cookie-service';
import { LanguageService } from '../../core/services/language.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { changesLayout } from 'src/app/store/layouts/layout.actions';
import { RootReducerState } from 'src/app/store';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { SimplebarAngularModule } from 'simplebar-angular';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, BsDropdownModule, SimplebarAngularModule],
})
export class TopbarComponent implements OnInit {
  mode: any;
  element: any;
  cookieValue: any;
  flagvalue: any;
  countryName: any;
  valueset: any;
  theme: any;
  layout: string;
  dataLayout$: Observable<string>;

  currentUser: any = null;
  userName: string = '';
  userEmail: string = '';

  // 🔹 Logout modal state
  showLogoutModal = false;

  constructor(
    @Inject(DOCUMENT) private document: any,
    private router: Router,
    private authService: AuthenticationService,
    private authFackservice: AuthfakeauthenticationService,
    private authGuardService: AuthGuardService,
    public languageService: LanguageService,
    public translate: TranslateService,
    public _cookiesService: CookieService,
    public store: Store<RootReducerState>
  ) {}

  @Output() settingsButtonClicked = new EventEmitter();
  @Output() mobileMenuButtonClicked = new EventEmitter();

  ngOnInit() {
    this.loadUserData();
    this.store.select('layout').subscribe((data) => {
      this.theme = data.DATA_LAYOUT;
    });
    this.element = document.documentElement;
  }

  private loadUserData(): void {
    this.currentUser = this.authGuardService.getCurrentUser();
    if (this.currentUser) {
      this.userName = this.currentUser.fullName || 'User';
      this.userEmail = this.currentUser.emailId || '';
    }
  }

  toggleRightSidebar() {
    this.settingsButtonClicked.emit();
  }

  toggleMobileMenu(event: any) {
    event.preventDefault();
    this.mobileMenuButtonClicked.emit();
  }

  /**
   * 🔹 Show Logout Confirmation Modal
   */
  logout() {
    this.showLogoutModal = true;
  }

  /**
   * 🔹 Confirm Logout
   */
  confirmLogout() {
    this.showLogoutModal = false;

    // Clear authentication data
    if (environment.defaultauth === 'firebase') {
      this.authService.logout();
    } else {
      this.authFackservice.logout();
    }

    this.clearAllAuthData();

    // Navigate to login page
    this.router.navigate(['/auth/login']).then(() => {
      this.preventBackNavigation();
    });
  }

  /**
   * 🔹 Cancel Logout
   */
  cancelLogout() {
    this.showLogoutModal = false;
  }

  private clearAllAuthData(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('lastSessionId');
    localStorage.removeItem('access_token');
    sessionStorage.clear();
  }

  private preventBackNavigation(): void {
    window.history.pushState(null, '', window.location.href);
    const backHandler = (): void => {
      window.history.pushState(null, '', window.location.href);
      if (!this.authGuardService.isAuthenticated()) {
        this.router.navigate(['/auth/login']);
      }
    };
    window.addEventListener('popstate', backHandler);
    setTimeout(() => {
      window.removeEventListener('popstate', backHandler);
    }, 1000);
  }
}
