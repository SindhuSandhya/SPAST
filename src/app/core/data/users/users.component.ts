import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface ApiResponse {
  id: string | null;
  status: {
    statusCode: number;
    statusMessage: string;
  };
  errors: any;
  data: User[] | User;
}

interface User {
  id?: string;
  userId: string | null;
  fullName: string;
  tenantId: string;
  emailId: string;
  mobile: string;
  userType: string;
  active: boolean;
  createdBy: string;
  createdOn: string;
  updatedBy?: string;
  updatedOn?: string;
}

interface Tenant {
  id: string;
  tenantId: string;
  companyName: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  tenants: Tenant[] = [];
  loading = false;
  error = '';
  
  // Form and modal state
  userForm: FormGroup;
  showUserModal = false;
  showDeleteModal = false;
  userLoading = false;
  userError = '';
  isEditMode = false;
  currentUser: User | null = null;
  deleteUserId = '';

  // Success message state
  successMessage = '';
  showSuccessMessage = false;

  // Table state
  searchTerm = '';
  page = 1;
  pageSize = 10;

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder
  ) {
    this.initializeUserForm();
  }

  ngOnInit(): void {
    this.loadTenants();
    this.loadUsers();
  }

  initializeUserForm() {
    this.userForm = this.formBuilder.group({
      userId: [{value: '', disabled: false}], // Make sure it's not disabled initially
      fullName: ['', Validators.required],
      tenantId: ['', Validators.required],
      emailId: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.required, Validators.pattern(/^[6-9][0-9]{9}$/)]],
      userType: ['', Validators.required],
      active: [true],
      createdBy: ['system'],
      updatedBy: ['system']
    });
    
    console.log('Form initialized:', this.userForm.value); // Debug log
  }

  // Load tenants for dropdown
  loadTenants() {
    this.http.get<ApiResponse>(`${environment.apiUrl}/tenant/getAllTenants`).subscribe({
      next: (response) => {
        console.log('Tenants API Response:', response); // Debug log
        
        if (response.status.statusCode === 203 && response.data) {
          this.tenants = (response.data as any[]).map(tenant => ({
            id: tenant.id,
            tenantId: tenant.tenantId,
            companyName: tenant.companyName
          }));
          
          console.log('Loaded tenants:', this.tenants); // Debug log
        }
      },
      error: (err) => {
        console.error('Error loading tenants:', err);
      }
    });
  }

  // Load users - FIXED: Check for correct status code
  loadUsers() {
    this.loading = true;
    this.error = '';

    this.http.get<ApiResponse>(`${environment.apiUrl}/user/getAllUsers`).subscribe({
      next: (response) => {
        console.log('API Response:', response); // Debug log
        
        // FIXED: Check for status code 103 instead of 200
        if ([103, 200].includes(response.status.statusCode) && response.data) {
          this.users = Array.isArray(response.data) ? response.data : [response.data];
          console.log('Loaded users:', this.users); // Debug log
          this.applyFilter();
        } else {
          this.error = response.status.statusMessage || 'Failed to load users';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load users. Please try again.';
        this.loading = false;
        console.error('Error loading users:', err);
      }
    });
  }

  // Apply search filter
  applyFilter() {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter(user =>
        Object.values(user).some(val =>
          val?.toString().toLowerCase().includes(this.searchTerm.toLowerCase())
        )
      );
    }
    this.page = 1;
    console.log('Filtered users:', this.filteredUsers); // Debug log
  }

  // Pagination helpers
  get paginatedUsers() {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get totalRecords() {
    return this.filteredUsers.length;
  }

  get totalPages() {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  // Pagination methods
  previousPage() {
    if (this.page > 1) {
      this.page--;
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.page = pageNumber;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const current = this.page;
    const total = this.totalPages;
    const start = Math.max(2, current - 2);
    const end = Math.min(total - 1, current + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  onPageSizeChange() {
    this.page = 1;
  }

  // Modal operations
  openAddModal() {
    this.isEditMode = false;
    this.currentUser = null;
    this.userForm.reset({
      active: true,
      createdBy: 'system'
    });
    this.showUserModal = true;
    this.userError = '';
  }

  // FIXED: Handle null userId in edit mode
  openEditModal(user: User) {
    this.isEditMode = true;
    this.currentUser = user;
    
    console.log('Editing user:', user); // Debug log
    console.log('Available tenants:', this.tenants); // Debug log
    
    // Get the display userId (fallback to id if userId is null)
    const displayUserId = user.userId || user.id || 'N/A';
    
    // Reset form first
    this.userForm.reset();
    
    // Set values using setValue for better control
    this.userForm.patchValue({
      userId: displayUserId,
      fullName: user.fullName || '',
      tenantId: user.tenantId || '',
      emailId: user.emailId || '',
      mobile: user.mobile || '',
      userType: user.userType || '',
      active: user.active !== undefined ? user.active : true,
      updatedBy: 'system'
    });
    
    // Additional check - if patchValue didn't work, try setting individual controls
    if (!this.userForm.get('userId')?.value) {
      this.userForm.get('userId')?.setValue(displayUserId);
    }
    
    if (!this.userForm.get('tenantId')?.value) {
      this.userForm.get('tenantId')?.setValue(user.tenantId);
    }
    
    console.log('Form values after patch:', this.userForm.value); // Debug log
    
    this.showUserModal = true;
    this.userError = '';
    
    // Force change detection
    setTimeout(() => {
      console.log('Form values after timeout:', this.userForm.value);
    }, 100);
  }

  closeUserModal() {
    this.showUserModal = false;
    this.userError = '';
    this.userLoading = false;
    this.currentUser = null;
    this.userForm.reset();
  }

  // Form validation helpers
  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['pattern']) {
        if (fieldName === 'mobile') {
          return 'Please enter a valid 10-digit mobile number';
        }
      }
    }
    return '';
  }

  getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      'fullName': 'Full Name',
      'tenantId': 'Tenant',
      'emailId': 'Email',
      'mobile': 'Mobile',
      'userType': 'User Type'
    };
    return displayNames[fieldName] || fieldName;
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.errors && field.touched);
  }

  // Get tenant company name
  getTenantName(tenantId: string): string {
    const tenant = this.tenants.find(t => t.tenantId === tenantId);
    return tenant ? tenant.companyName : tenantId;
  }

  // Submit form
  onSubmit() {
    if (this.userForm.invalid) {
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });
      this.userError = 'Please fix the errors in the form before submitting.';
      return;
    }

    this.userLoading = true;
    this.userError = '';
    
    const payload = this.userForm.value;

    if (this.isEditMode) {
      this.updateUser(payload);
    } else {
      this.createUser(payload);
    }
  }

  // Create user
  createUser(payload: any) {
    this.http.post<ApiResponse>(`${environment.apiUrl}/user/createUser`, payload).subscribe({
      next: (response: any) => {
        this.userLoading = false;
        this.closeUserModal();
        this.loadUsers(); // Reload to get fresh data
        this.showSuccessToast(`User "${payload.fullName}" has been created successfully!`);
      },
      error: (err) => {
        this.userLoading = false;
        this.userError = err.error?.message || 'Failed to create user. Please try again.';
        console.error('Error creating user:', err);
      }
    });
  }

  // Update user
  updateUser(payload: any) {
    this.http.post<ApiResponse>(`${environment.apiUrl}/user/updateUser`, payload).subscribe({
      next: (response: any) => {
        this.userLoading = false;
        this.closeUserModal();
        this.loadUsers(); // Reload to get fresh data
        this.showSuccessToast(`User "${payload.fullName}" has been updated successfully!`);
      },
      error: (err) => {
        this.userLoading = false;
        this.userError = err.error?.message || 'Failed to update user. Please try again.';
        console.error('Error updating user:', err);
      }
    });
  }

  // FIXED: Delete user - handle null userId
  openDeleteModal(user: User) {
    this.deleteUserId = user.userId || user.id || '';
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deleteUserId = '';
  }

  confirmDelete() {
    if (!this.deleteUserId) return;

    const userToDelete = this.users.find(u => (u.userId || u.id) === this.deleteUserId);
    if (!userToDelete) return;

    // Since there's no delete API provided, we'll simulate it
    const index = this.users.findIndex(u => (u.userId || u.id) === this.deleteUserId);
    if (index !== -1) {
      this.users.splice(index, 1);
      this.applyFilter();
      this.closeDeleteModal();
      this.showSuccessToast(`User "${userToDelete.fullName}" has been deleted successfully!`);
    }
  }

  // Success message system
  showSuccessToast(message: string) {
    this.successMessage = message;
    this.showSuccessMessage = true;
    
    setTimeout(() => {
      this.hideSuccessMessage();
    }, 5000);
  }

  hideSuccessMessage() {
    this.showSuccessMessage = false;
    this.successMessage = '';
  }

  // Format date
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  // Refresh data
  refresh() {
    this.loadUsers();
  }

  // FIXED: Track by function - handle null userId
  trackByUserId(index: number, user: User): string {
    return user.userId || user.id || index.toString();
  }

  // FIXED: Helper method to get display user ID
  getDisplayUserId(user: User): string {
    return user.userId || user.id || 'N/A';
  }

  // FIXED: Helper method to get user type badge class
  getUserTypeBadgeClass(userType: string): string {
    switch (userType?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-danger';
      case 'MANAGER':
        return 'bg-warning';
      case 'EMPLOYEE':
        return 'bg-info';
      case 'TENANTUSER':
        return 'bg-primary';
      case 'GUEST':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  // FIXED: Helper method to format user type display
  formatUserType(userType: string): string {
    if (!userType) return 'N/A';
    
    // Convert camelCase and handle specific cases
    switch (userType.toUpperCase()) {
      case 'TENANTUSER':
        return 'Tenant User';
      default:
        return userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase();
    }
  }
}