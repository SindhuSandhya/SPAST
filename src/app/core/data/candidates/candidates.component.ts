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
  data: Candidate[] | Candidate;
}

interface Candidate {
  id?: string;
  candidateId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fatherName: string;
  dateOfBirth: string;
  gender: string;
  mobile: string;
  emailId: string;
  dateOfJoining?: string;
  caseReceiveDate: string;
  employeeId?: string;
  location: string;
  uan?: string;
  employmentType: string;
  active: boolean;
  createdBy: string;
  createdOn: string;
  updatedBy?: string;
  updatedOn?: string;
}

interface Location {
  id: string;
  locationId: string;
  locationName: string;
  city: string;
  state: string;
}

interface Document {
  id?: string;
  fileName: string;
  fileType: string;
  documentType: string;
  fileSize: number;
  uploadDate: string;
  file?: File;
}

interface DocumentType {
  id: string;
  typeName: string;
  description: string;
}

@Component({
  selector: 'app-candidates',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './candidates.component.html',
  styleUrls: ['./candidates.component.css']
})
export class CandidatesComponent implements OnInit {
  candidates: Candidate[] = [];
  filteredCandidates: Candidate[] = [];
  locations: Location[] = [];
  documentTypes: DocumentType[] = [];
  candidateDocuments: Document[] = [];
  loading = false;
  error = '';
  
  // Form and modal state
  candidateForm: FormGroup;
  showCandidateModal = false;
  showDeleteModal = false;
  candidateLoading = false;
  candidateError = '';
  isEditMode = false;
  currentCandidate: Candidate | null = null;
  deleteCandidateId = '';

  // Document upload state
  selectedDocumentType = '';
  dragOver = false;
  uploadError = '';
  maxFileSize = 2 * 1024 * 1024; // 2MB
  allowedFileTypes = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.zip'];
  maxFiles = 10;

  // Success message state
  successMessage = '';
  showSuccessMessage = false;

  // Table state
  searchTerm = '';
  page = 1;
  pageSize = 10;

  // Gender and Employment Type options
  genderOptions = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' }
  ];

  employmentTypeOptions = [
    { value: 'PRE_EMPLOYMENT', label: 'Pre Employment' },
    { value: 'POST_EMPLOYMENT', label: 'Post Employment' }
  ];

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder
  ) {
    this.initializeCandidateForm();
  }

  ngOnInit(): void {
    console.log('Candidates Component initializing...');
    this.loadLocations();
    this.loadDocumentTypes();
    this.loadCandidates();
    console.log('Initial form state:', this.candidateForm.value);
  }

  initializeCandidateForm() {
    this.candidateForm = this.formBuilder.group({
      candidateId: [{value: '', disabled: false}],
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      fatherName: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern(/^[6-9][0-9]{9}$/)]],
      emailId: ['', [Validators.required, Validators.email]],
      dateOfJoining: [''],
      caseReceiveDate: ['', Validators.required],
      employeeId: [''],
      location: ['', Validators.required],
      uan: [''],
      employmentType: ['', Validators.required],
      active: [true],
      createdBy: ['system'],
      updatedBy: ['system']
    });
    
    // Set default case receive date to today
    const today = new Date().toISOString().split('T')[0];
    this.candidateForm.patchValue({
      caseReceiveDate: today
    });
    
    console.log('Form initialized:', this.candidateForm.value);
  }

  // Load locations for dropdown
  loadLocations() {
    this.http.get<ApiResponse>(`${environment.apiUrl}/location/getAllLocations`).subscribe({
      next: (response) => {
        console.log('Locations API Response:', response);
        
        if ([200, 203].includes(response.status.statusCode) && response.data) {
          this.locations = (response.data as any[]).map(location => ({
            id: location.id,
            locationId: location.locationId,
            locationName: location.locationName,
            city: location.city,
            state: location.state
          }));
          
          console.log('Loaded locations:', this.locations);
        } else {
          console.warn('Locations not loaded properly. Status:', response.status.statusCode);
        }
      },
      error: (err) => {
        console.error('Error loading locations:', err);
      }
    });
  }

  // Load candidates
  loadCandidates() {
    this.loading = true;
    this.error = '';

    this.http.get<ApiResponse>(`${environment.apiUrl}/candidate/getAllCandidates`).subscribe({
      next: (response) => {
        console.log('Candidates API Response:', response);
        
        if ([103, 200].includes(response.status.statusCode) && response.data) {
          this.candidates = Array.isArray(response.data) ? response.data : [response.data];
          console.log('Loaded candidates:', this.candidates);
          this.applyFilter();
        } else {
          this.error = response.status.statusMessage || 'Failed to load candidates';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load candidates. Please try again.';
        this.loading = false;
        console.error('Error loading candidates:', err);
      }
    });
  }

  // Apply search filter
  applyFilter() {
    if (!this.searchTerm.trim()) {
      this.filteredCandidates = [...this.candidates];
    } else {
      this.filteredCandidates = this.candidates.filter(candidate =>
        Object.values(candidate).some(val =>
          val?.toString().toLowerCase().includes(this.searchTerm.toLowerCase())
        )
      );
    }
    this.page = 1;
    console.log('Filtered candidates:', this.filteredCandidates);
  }

  // Pagination helpers
  get paginatedCandidates() {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredCandidates.slice(start, start + this.pageSize);
  }

  get totalRecords() {
    return this.filteredCandidates.length;
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
    this.currentCandidate = null;
    
    // Reset form with default values
    const today = new Date().toISOString().split('T')[0];
    this.candidateForm.reset({
      active: true,
      createdBy: 'system',
      caseReceiveDate: today
    });
    
    // Reset documents
    this.resetDocuments();
    
    this.showCandidateModal = true;
    this.candidateError = '';
  }

  // Ensure locations are loaded before opening edit modal
  openEditModalWithLocations(candidate: Candidate) {
    if (this.locations.length === 0) {
      console.log('Locations not loaded yet, loading now...');
      this.loadLocations();
      setTimeout(() => {
        this.openEditModal(candidate);
      }, 500);
    } else {
      this.openEditModal(candidate);
    }
  }

  openEditModal(candidate: Candidate) {
    this.isEditMode = true;
    this.currentCandidate = candidate;
    
    console.log('=== EDIT CANDIDATE DEBUG ===');
    console.log('Candidate data:', candidate);
    console.log('Available locations:', this.locations);
    
    const displayCandidateId = candidate.candidateId || candidate.id || '';
    
    console.log('Display Candidate ID:', displayCandidateId);
    console.log('Location from candidate:', candidate.location);
    
    this.candidateError = '';
    
    // Convert dates for form inputs
    const dobFormatted = candidate.dateOfBirth ? this.formatDateForInput(candidate.dateOfBirth) : '';
    const dojFormatted = candidate.dateOfJoining ? this.formatDateForInput(candidate.dateOfJoining) : '';
    const caseReceiveDateFormatted = candidate.caseReceiveDate ? this.formatDateForInput(candidate.caseReceiveDate) : '';
    
    this.candidateForm.setValue({
      candidateId: displayCandidateId,
      firstName: candidate.firstName || '',
      middleName: candidate.middleName || '',
      lastName: candidate.lastName || '',
      fatherName: candidate.fatherName || '',
      dateOfBirth: dobFormatted,
      gender: candidate.gender || '',
      mobile: candidate.mobile || '',
      emailId: candidate.emailId || '',
      dateOfJoining: dojFormatted,
      caseReceiveDate: caseReceiveDateFormatted,
      employeeId: candidate.employeeId || '',
      location: candidate.location || '',
      uan: candidate.uan || '',
      employmentType: candidate.employmentType || '',
      active: candidate.active !== undefined ? candidate.active : true,
      createdBy: candidate.createdBy || 'system',
      updatedBy: 'system'
    });
    
    console.log('Form values after setValue:', this.candidateForm.value);
    console.log('Form valid:', this.candidateForm.valid);
    console.log('=== END DEBUG ===');
    
    this.showCandidateModal = true;
  }

  closeCandidateModal() {
    this.showCandidateModal = false;
    this.candidateError = '';
    this.candidateLoading = false;
    this.currentCandidate = null;
    this.candidateForm.reset();
    
    // Reset documents
    this.resetDocuments();
  }

  // Form validation helpers
  getFieldError(fieldName: string): string {
    const field = this.candidateForm.get(fieldName);
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
      'firstName': 'First Name',
      'middleName': 'Middle Name',
      'lastName': 'Last Name',
      'fatherName': 'Father\'s Name',
      'dateOfBirth': 'Date of Birth',
      'gender': 'Gender',
      'mobile': 'Mobile Number',
      'emailId': 'Email ID',
      'dateOfJoining': 'Date of Joining',
      'caseReceiveDate': 'Case Receive Date',
      'employeeId': 'Employee ID',
      'location': 'Location',
      'uan': 'UAN',
      'employmentType': 'Employment Type'
    };
    return displayNames[fieldName] || fieldName;
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.candidateForm.get(fieldName);
    return !!(field && field.errors && field.touched);
  }

  // Get location name
  getLocationName(locationId: string): string {
    const location = this.locations.find(l => l.locationId === locationId);
    return location ? `${location.locationName}, ${location.city}` : locationId;
  }

  // Get full name
  getFullName(candidate: Candidate): string {
    const parts = [candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean);
    return parts.join(' ');
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

  // Format date for input fields
  formatDateForInput(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  // Get display candidate ID
  getDisplayCandidateId(candidate: Candidate): string {
    return candidate.candidateId || candidate.id || 'N/A';
  }

  // Get gender badge class
  getGenderBadgeClass(gender: string): string {
    switch (gender?.toUpperCase()) {
      case 'MALE':
        return 'bg-primary';
      case 'FEMALE':
        return 'bg-success';
      case 'OTHER':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  // Get employment type badge class
  getEmploymentTypeBadgeClass(empType: string): string {
    switch (empType?.toUpperCase()) {
      case 'PRE_EMPLOYMENT':
        return 'bg-warning';
      case 'POST_EMPLOYMENT':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  // Format display values
  formatGender(gender: string): string {
    if (!gender) return 'N/A';
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  }

  formatEmploymentType(empType: string): string {
    if (!empType) return 'N/A';
    
    switch (empType.toUpperCase()) {
      case 'PRE_EMPLOYMENT':
        return 'Pre Employment';
      case 'POST_EMPLOYMENT':
        return 'Post Employment';
      default:
        return empType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  // Submit form
  onSubmit() {
    if (this.candidateForm.invalid) {
      Object.keys(this.candidateForm.controls).forEach(key => {
        this.candidateForm.get(key)?.markAsTouched();
      });
      this.candidateError = 'Please fix the errors in the form before submitting.';
      return;
    }

    this.candidateLoading = true;
    this.candidateError = '';
    
    const payload = this.candidateForm.value;

    if (this.isEditMode) {
      this.updateCandidate(payload);
    } else {
      this.createCandidate(payload);
    }
  }

  // Create candidate
  createCandidate(payload: any) {
    this.http.post<ApiResponse>(`${environment.apiUrl}/candidate/createCandidate`, payload).subscribe({
      next: (response: any) => {
        this.candidateLoading = false;
        this.closeCandidateModal();
        this.loadCandidates();
        this.showSuccessToast(`Candidate "${this.getFullName(payload)}" has been created successfully!`);
      },
      error: (err) => {
        this.candidateLoading = false;
        this.candidateError = err.error?.message || 'Failed to create candidate. Please try again.';
        console.error('Error creating candidate:', err);
      }
    });
  }

  // Update candidate
  updateCandidate(payload: any) {
    this.http.put<ApiResponse>(`${environment.apiUrl}/candidate/updateCandidate`, payload).subscribe({
      next: (response: any) => {
        this.candidateLoading = false;
        this.closeCandidateModal();
        this.loadCandidates();
        this.showSuccessToast(`Candidate "${this.getFullName(payload)}" has been updated successfully!`);
      },
      error: (err) => {
        this.candidateLoading = false;
        this.candidateError = err.error?.message || 'Failed to update candidate. Please try again.';
        console.error('Error updating candidate:', err);
      }
    });
  }

  // Delete candidate
  openDeleteModal(candidate: Candidate) {
    this.deleteCandidateId = candidate.candidateId || candidate.id || '';
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deleteCandidateId = '';
  }

  confirmDelete() {
    if (!this.deleteCandidateId) return;

    const candidateToDelete = this.candidates.find(c => 
      (c.candidateId || c.id) === this.deleteCandidateId
    );
    if (!candidateToDelete) return;

    // Since there's no delete API provided, we'll simulate it
    const index = this.candidates.findIndex(c => 
      (c.candidateId || c.id) === this.deleteCandidateId
    );
    if (index !== -1) {
      this.candidates.splice(index, 1);
      this.applyFilter();
      this.closeDeleteModal();
      this.showSuccessToast(`Candidate "${this.getFullName(candidateToDelete)}" has been deleted successfully!`);
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

  // Refresh data
  refresh() {
    this.loadCandidates();
  }

  // Track by function for performance
  trackByCandidateId(index: number, candidate: Candidate): string {
    return candidate.candidateId || candidate.id || index.toString();
  }

  // Load document types for dropdown
  loadDocumentTypes() {
    this.http.get<ApiResponse>(`${environment.apiUrl}/documentType/getAllDocumentTypes`).subscribe({
      next: (response) => {
        console.log('Document Types API Response:', response);
        
        if ([200, 203].includes(response.status.statusCode) && response.data) {
          this.documentTypes = (response.data as any[]).map(docType => ({
            id: docType.id,
            typeName: docType.typeName,
            description: docType.description
          }));
          
          console.log('Loaded document types:', this.documentTypes);
        } else {
          // Default document types if API fails
          this.documentTypes = [
            { id: '1', typeName: 'Aadhaar Card', description: 'Identity proof' },
            { id: '2', typeName: 'PAN Card', description: 'Permanent Account Number' },
            { id: '3', typeName: 'Passport', description: 'Travel document' },
            { id: '4', typeName: 'Driving License', description: 'Driving permit' },
            { id: '5', typeName: 'Resume', description: 'Curriculum Vitae' },
            { id: '6', typeName: 'Educational Certificate', description: 'Academic qualification' },
            { id: '7', typeName: 'Experience Letter', description: 'Work experience proof' },
            { id: '8', typeName: 'Salary Slip', description: 'Income proof' },
            { id: '9', typeName: 'Bank Statement', description: 'Financial document' },
            { id: '10', typeName: 'Other', description: 'Other documents' }
          ];
        }
      },
      error: (err) => {
        console.error('Error loading document types:', err);
        // Set default document types
        this.documentTypes = [
          { id: '1', typeName: 'Aadhaar Card', description: 'Identity proof' },
          { id: '2', typeName: 'PAN Card', description: 'Permanent Account Number' },
          { id: '3', typeName: 'Passport', description: 'Travel document' },
          { id: '4', typeName: 'Driving License', description: 'Driving permit' },
          { id: '5', typeName: 'Resume', description: 'Curriculum Vitae' },
          { id: '6', typeName: 'Educational Certificate', description: 'Academic qualification' },
          { id: '7', typeName: 'Experience Letter', description: 'Work experience proof' },
          { id: '8', typeName: 'Salary Slip', description: 'Income proof' },
          { id: '9', typeName: 'Bank Statement', description: 'Financial document' },
          { id: '10', typeName: 'Other', description: 'Other documents' }
        ];
      }
    });
  }

  // File upload methods
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(files);
    }
  }

  onFileSelect(event: any) {
    const files = event.target.files;
    if (files) {
      this.handleFiles(files);
    }
  }

  handleFiles(files: FileList) {
    this.uploadError = '';

    if (!this.selectedDocumentType) {
      this.uploadError = 'Please select a document type before uploading files.';
      return;
    }

    if (this.candidateDocuments.length + files.length > this.maxFiles) {
      this.uploadError = `Maximum ${this.maxFiles} files allowed. You can upload ${this.maxFiles - this.candidateDocuments.length} more files.`;
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!this.allowedFileTypes.includes(fileExtension)) {
        this.uploadError = `File type ${fileExtension} not supported. Allowed types: ${this.allowedFileTypes.join(', ')}`;
        continue;
      }

      // Validate file size
      if (file.size > this.maxFileSize) {
        this.uploadError = `File ${file.name} exceeds maximum size of 2MB.`;
        continue;
      }

      // Add to documents list
      const document: Document = {
        id: Date.now().toString() + i,
        fileName: file.name,
        fileType: fileExtension,
        documentType: this.selectedDocumentType,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        file: file
      };

      this.candidateDocuments.push(document);
    }

    // Reset file input
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  addDocument() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  removeDocument(documentId: string) {
    this.candidateDocuments = this.candidateDocuments.filter(doc => doc.id !== documentId);
  }

  getDocumentTypeName(typeId: string): string {
    const docType = this.documentTypes.find(dt => dt.id === typeId);
    return docType ? docType.typeName : typeId;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case '.pdf':
        return 'mdi-file-pdf';
      case '.doc':
      case '.docx':
        return 'mdi-file-word';
      case '.jpg':
      case '.jpeg':
      case '.png':
        return 'mdi-file-image';
      case '.zip':
        return 'mdi-file-archive';
      default:
        return 'mdi-file-document';
    }
  }

  resetDocuments() {
    this.candidateDocuments = [];
    this.selectedDocumentType = '';
    this.uploadError = '';
  }

  // Track by function for documents
  trackByDocumentId(index: number, document: Document): string {
    return document.id || index.toString();
  }
}