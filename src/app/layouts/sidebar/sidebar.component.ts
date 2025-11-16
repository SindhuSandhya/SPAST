import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, Input, OnChanges } from '@angular/core';
import MetisMenu from 'metismenujs';
import { EventService } from '../../core/services/event.service';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MENU } from './menu';
import { MenuItem } from './menu.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SimplebarAngularModule } from 'simplebar-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [SimplebarAngularModule, RouterModule, CommonModule, TranslateModule]
})
export class SidebarComponent implements OnInit, AfterViewInit, OnChanges {
  @ViewChild('componentRef') scrollRef;
  @Input() isCondensed = false;
  @ViewChild('sideMenu') sideMenu: ElementRef;

  menu: any;
  menuItems: MenuItem[] = [];
  userRole: string = ''; // 'super-admin' | 'TenantUser'

  constructor(
    private eventService: EventService,
    private router: Router,
    public translate: TranslateService,
    private http: HttpClient
  ) {
    router.events.forEach((event) => {
      if (event instanceof NavigationEnd) {
        this._activateMenuDropdown();
        this._scrollElement();
      }
    });
  }

  ngOnInit() {
    this.initialize();
    this._scrollElement();
  }

  ngAfterViewInit() {
    this.menu = new MetisMenu(this.sideMenu.nativeElement);
    this._activateMenuDropdown();
  }

  ngOnChanges() {
    if (!this.isCondensed && this.sideMenu || this.isCondensed) {
      setTimeout(() => {
        this.menu = new MetisMenu(this.sideMenu.nativeElement);
      });
    } else if (this.menu) {
      this.menu.dispose();
    }
  }

  /**
   * Initialize the sidebar menu based on user role
   */
  initialize(): void {
    // ✅ Get the user role — assuming it’s stored in localStorage after login
    this.userRole = localStorage.getItem('userRole') || 'TenantUser';

    // Build menu according to role rules:
    // - super-admin: Dashboard, Tenants, Configuration (with Competencies + Users)
    // - TenantUser: Dashboard, Configuration (with Competencies only)
    const role = this.userRole;

    const allowedTop = ['Dashboard', 'Configuration'];
    if (role === 'super-admin') {
      // super-admin should also see Tenants
      allowedTop.push('Tenants');
    }

    // TenantUser should additionally see Candidates
    if (role === 'TenantUser') {
      allowedTop.push('Candidates');
    }

    // Filter top-level items and clone Configuration subitems per role
    this.menuItems = MENU
      .filter((item) => allowedTop.includes(item.label))
      .map((item) => {
        // deep clone basic item to avoid mutating original MENU
        const newItem: any = { ...item };
        if (newItem.subItems && newItem.subItems.length) {
          if (role === 'super-admin') {
            // super-admin sees both Competencies and Users (no filtering)
            newItem.subItems = newItem.subItems.filter((s) => ['Competencies', 'Users'].includes(s.label));
          } else {
            // TenantUser sees only Competencies
            newItem.subItems = newItem.subItems.filter((s) => s.label === 'Competencies');
          }
        }
        return newItem as MenuItem;
      });
  }

  toggleMenu(event) {
    event.currentTarget.nextElementSibling.classList.toggle('mm-show');
  }

  _scrollElement() {
    setTimeout(() => {
      if (document.getElementsByClassName('mm-active').length > 0) {
        const currentPosition = document.getElementsByClassName('mm-active')[0]['offsetTop'];
        if (currentPosition > 500)
          if (this.scrollRef.SimpleBar !== null)
            this.scrollRef.SimpleBar.getScrollElement().scrollTop = currentPosition + 300;
      }
    }, 300);
  }

  _removeAllClass(className) {
    const els = document.getElementsByClassName(className);
    while (els[0]) {
      els[0].classList.remove(className);
    }
  }

  _activateMenuDropdown() {
    this._removeAllClass('mm-active');
    this._removeAllClass('mm-show');
    const links = document.getElementsByClassName('side-nav-link-ref');
    let menuItemEl = null;
    const paths = [];

    for (let i = 0; i < links.length; i++) {
      paths.push(links[i]['pathname']);
    }

    const itemIndex = paths.indexOf(window.location.pathname);
    if (itemIndex === -1) {
      const strIndex = window.location.pathname.lastIndexOf('/');
      const item = window.location.pathname.substr(0, strIndex).toString();
      menuItemEl = links[paths.indexOf(item)];
    } else {
      menuItemEl = links[itemIndex];
    }

    if (menuItemEl) {
      menuItemEl.classList.add('active');
      const parentEl = menuItemEl.parentElement;
      if (parentEl) {
        parentEl.classList.add('mm-active');
        const parent2El = parentEl.parentElement.closest('ul');
        if (parent2El && parent2El.id !== 'side-menu') {
          parent2El.classList.add('mm-show');
          const parent3El = parent2El.parentElement;
          if (parent3El && parent3El.id !== 'side-menu') {
            parent3El.classList.add('mm-active');
            const childAnchor = parent3El.querySelector('.has-arrow');
            if (childAnchor) { childAnchor.classList.add('mm-active'); }
          }
        }
      }
    }
  }

  hasItems(item: MenuItem) {
    return item.subItems !== undefined ? item.subItems.length > 0 : false;
  }
}
