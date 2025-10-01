import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface ApiResponse {
  id: string | null;
  status: {
    statusCode: number;
    statusMessage: string;
  };
  errors: any;
  data: Tenant[];
}

interface Tenant {
  id: string;
  tenantId: string;
  companyName: string;
  address: string;
  gstNo: string;
  pan: string;
  cin?: string;
  typeOfEstablishment: string;
  contactPersonName: string;
  contactEmail: string;
  contactPhoneNumber: string;
  s3BucketName?: string;
  isActive: boolean;
  createdOn: string;
  updatedOn: string;
  createdBy: string;
}

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './tenants.component.html',
  styleUrls: ['./tenants.component.css']
})
export class TenantsComponent implements OnInit {
  tenants: Tenant[] = [];
  filteredTenants: Tenant[] = [];
  loading = false;
  error = '';

  // Edit modal state
  showEditModal = false;
  editForm: FormGroup;
  editLoading = false;
  editError = '';
  currentTenant: Tenant | null = null;

  // Success message state
  successMessage = '';
  showSuccessMessage = false;

  // table state
  searchTerm = '';
  page = 1;
  pageSize = 10;

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder
  ) {
    this.initializeEditForm();
  }

  ngOnInit(): void {
    this.loadTenants();
  }

  initializeEditForm() {
    this.editForm = this.formBuilder.group({
      tenantId: ['', Validators.required],
      companyName: ['', Validators.required],
      typeOfEstablishment: ['', Validators.required],
      address: ['', Validators.required],
      cin: [''],
      gstNo: ['', [Validators.required, Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)]],
      pan: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]],
      contactPersonName: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhoneNumber: ['', [Validators.required, Validators.pattern(/^[6-9][0-9]{9}$/)]]
    });
  }

  loadTenants() {
    this.loading = true;
    this.error = '';

    this.http.get<ApiResponse>(`${environment.apiUrl}/tenant/getAllTenants`).subscribe({
      next: (response) => {
        if (response.status.statusCode === 203 && response.data) {
          this.tenants = response.data;
          this.applyFilter();
        } else {
          this.error = response.status.statusMessage || 'Failed to load tenants';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load tenants. Please try again.';
        this.loading = false;
        console.error('Error loading tenants:', err);
      }
    });
  }

  applyFilter() {
    if (!this.searchTerm.trim()) {
      this.filteredTenants = [...this.tenants];
    } else {
      this.filteredTenants = this.tenants.filter(tenant =>
        Object.values(tenant).some(val =>
          val?.toString().toLowerCase().includes(this.searchTerm.toLowerCase())
        )
      );
    }
    // Reset to first page when filtering
    this.page = 1;
  }

  get paginatedTenants() {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredTenants.slice(start, start + this.pageSize);
  }

  get totalRecords() {
    return this.filteredTenants.length;
  }

  get totalPages() {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  // Format date for display
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

  // Navigate to previous page
  previousPage() {
    if (this.page > 1) {
      this.page--;
    }
  }

  // Navigate to next page
  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
    }
  }

  // Go to specific page
  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.page = pageNumber;
    }
  }

  // Get array of page numbers for pagination
  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Get visible page numbers for complex pagination
  getVisiblePages(): number[] {
    const pages: number[] = [];
    const current = this.page;
    const total = this.totalPages;

    // Show 2 pages before and after current page
    const start = Math.max(2, current - 2);
    const end = Math.min(total - 1, current + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Change page size and reset to first page
  onPageSizeChange() {
    this.page = 1;
  }

  // Refresh data
  refresh() {
    this.loadTenants();
  }

  // Edit tenant (placeholder)
  editTenant(tenant: Tenant) {
    this.currentTenant = tenant;
    this.editForm.patchValue({
      tenantId: tenant.tenantId,
      companyName: tenant.companyName,
      typeOfEstablishment: tenant.typeOfEstablishment,
      address: tenant.address,
      cin: tenant.cin || '',
      gstNo: tenant.gstNo,
      pan: tenant.pan,
      contactPersonName: tenant.contactPersonName,
      contactEmail: tenant.contactEmail,
      contactPhoneNumber: tenant.contactPhoneNumber
    });
    this.showEditModal = true;
    this.editError = '';
  }

  // Close edit modal
  closeEditModal() {
    this.showEditModal = false;
    this.editError = '';
    this.editLoading = false;
    this.currentTenant = null;
    this.editForm.reset();
  }

  // Get form field error message
  getEditFieldError(fieldName: string): string {
    const field = this.editForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['pattern']) {
        if (fieldName === 'contactPhoneNumber') {
          return 'Please enter a valid 10-digit mobile number';
        }
        if (fieldName === 'gstNo') {
          return 'Please enter a valid GST number';
        }
        if (fieldName === 'pan') {
          return 'Please enter a valid PAN number';
        }
      }
    }
    return '';
  }

  // Get display name for field
  getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      'companyName': 'Company Name',
      'typeOfEstablishment': 'Type of Establishment',
      'address': 'Address',
      'cin': 'CIN',
      'gstNo': 'GST Number',
      'pan': 'PAN',
      'contactPersonName': 'Contact Person Name',
      'contactEmail': 'Contact Email',
      'contactPhoneNumber': 'Contact Phone Number'
    };
    return displayNames[fieldName] || fieldName;
  }

  // Check if field has error
  hasEditFieldError(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field && field.errors && field.touched);
  }

  // Update tenant
  updateTenant() {
    if (this.editForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.editForm.controls).forEach(key => {
        this.editForm.get(key)?.markAsTouched();
      });
      this.editError = 'Please fix the errors in the form before submitting.';
      return;
    }

    this.editLoading = true;
    this.editError = '';
    
    const payload = this.editForm.value;

    this.http.post(`${environment.apiUrl}/tenant/updateTenant`, payload).subscribe({
      next: (response: any) => {
        this.editLoading = false;
        this.closeEditModal();
        
        // Update the tenant in the local array
        const index = this.tenants.findIndex(t => t.tenantId === payload.tenantId);
        if (index !== -1) {
          this.tenants[index] = { ...this.tenants[index], ...payload };
          this.applyFilter();
        }
        
        // Show success message
        this.showSuccessToast(`Tenant "${payload.companyName}" has been updated successfully!`);
      },
      error: (err) => {
        this.editLoading = false;
        this.editError = err.error?.message || 'Failed to update tenant. Please try again.';
        console.error('Error updating tenant:', err);
      }
    });
  }

  // Show success toast message
  showSuccessToast(message: string) {
    this.successMessage = message;
    this.showSuccessMessage = true;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      this.hideSuccessMessage();
    }, 5000);
  }

  // Hide success message
  hideSuccessMessage() {
    this.showSuccessMessage = false;
    this.successMessage = '';
  }

  // Delete tenant (placeholder)
  deleteTenant(tenant: Tenant) {
    if (confirm(`Are you sure you want to delete tenant ${tenant.companyName}?`)) {
      console.log('Delete tenant:', tenant);
      // Implement delete functionality
    }
  }

  // TrackBy function for better performance
  trackByTenantId(index: number, tenant: Tenant): string {
    return tenant.id;
  }
}