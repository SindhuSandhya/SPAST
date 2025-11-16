import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { BulkImportCandidatesComponent } from './bulk-import-candidates/bulk-import-candidates.component';
import * as $ from 'jquery';
import { Router } from '@angular/router';
import { NgxDocViewerModule } from 'ngx-doc-viewer';
import { SafeUrlPipe } from 'src/app/pipes/safeUrl.pipe';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as CryptoJS from 'crypto-js';
import { DomSanitizer } from '@angular/platform-browser';
import { PdfViewerComponent } from "../pdf-viewer/pdf-viewer.component";
import { Toast, ToastrService } from 'ngx-toastr';

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
  reportUrl: string;
  candidateId: string;
  tenantId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
  emailId: string;
  uan?: string;
  createdOn: string;
  updatedOn: string;
  active?: boolean;
  createdBy?: string;
  updatedBy?: string;
  id?: string; // For internal use if needed
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BulkImportCandidatesComponent, SafeUrlPipe, NgxDocViewerModule, PdfViewerComponent],
  templateUrl: './candidates.component.html',
  styleUrls: ['./candidates.component.css']
})
export class CandidatesComponent implements OnInit {
  currentPdfUrl: string = '';
  candidate: any = {
    name: 'Uday Kiran Reddy',
    designation: 'Software Engineer',
    email: 'kiranreddyuday@gmail.com',
    phone: '9182078512',
    birthDate: '2002-01-26',
    status: 'ACTIVE',
    documentsVerified: 4,
    totalDocuments: 5,
    documents: [
      {
        name: 'PAN Card',
        number: 'ABCDE1234F',
        icon: '🆔',
        status: 'VERIFIED',
        details: {
          label: 'Valid',
          value: '✓ | Issued: Income Tax Department'
        }
      },
      {
        name: 'Aadhaar Card',
        number: 'XXXX XXXX 9024',
        icon: '🆔',
        status: 'VERIFIED',
        details: {
          label: 'Valid',
          value: '✓ | Issued: UIDAI'
        }
      }
    ],
    education: [
      {
        degree: 'B.Tech',
        institution: 'IIT Delhi',
        duration: '2018-2022',
        grade: '85%',
        status: 'COMPLETED'
      }
    ],
    employment: [
      {
        position: 'Software Engineer',
        company: 'TechCorp',
        duration: '2022 - Present',
        location: 'Bangalore',
        salary: '₹18,00,000',
        status: 'CURRENT',
        responsibilities: [
          'Developed web applications',
          'Maintained system performance'
        ]
      }
    ],
    addressDetails: {
      claimed: 'Xxxxxxxxx, XXXXX, XXXXX, XXXX',
      verified: 'Xxxxxxxxx, XXXXX, XXXXX, XXXX',
      status: 'GREEN'
    },
    identityDetails: {
      idType: 'PAN',
      idNumber: 'ABCDE1234F',
      status: 'GREEN'
    }
  };

  candidates: Candidate[] = [];
  showAssignCheckModal = false;
  showPdfModal = false;
  selectedCompetency: string | null = null;
  assignedCompetencies: any[] = []; // Holds competencies that have been added
  competencies: any[] = []; // List of available competencies
  selectedCandidate: any = null; // Store selected candidate
  filteredCandidates: Candidate[] = [];
  locations: Location[] = [];
  documentTypes: DocumentType[] = [];
  candidateDocuments: Document[] = [];
  loading = false;
  error = '';
  pdfPopup: Window | null = null;

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

  // Import modal state
  showImportModal = false;
  importLoading = false;
  importError = '';

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
  docUrl: string;
  fileType: string;
  pdfUrlSafe: any;

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private router: Router,
    private sanitizer: DomSanitizer,
    public toastr: ToastrService
  ) {
    this.initializeCandidateForm();
  }

  ngOnInit(): void {
    console.log('Candidates Component initializing...');
    // this.loadLocations();
    // this.loadDocumentTypes();
    this.loadCandidates();
    this.loadCompetencies();
    console.log('Initial form state:', this.candidateForm.value);
  }

  loadCompetencies() {
    const tenantId = sessionStorage.getItem('tenantId');
    const url = `${environment.apiUrl}/tenantLevelCompetencies/getAllCompetencies?tenantId=${tenantId}`;
    this.http.get(url, {}).subscribe(response => {
      if (response && response['data']) {
        this.competencies = response['data'];
      }
    });
  }

  extractS3KeyFromUrl(url: string): string {
    try {
      // Parse the URL
      const urlObj = new URL(url);

      // Get the pathname (everything after the domain)
      // pathname will be: /QZ2ONJ-%5E%24Qdoq/Sasidhar_Report.pdf
      let pathname = urlObj.pathname;

      // Remove leading slash
      if (pathname.startsWith('/')) {
        pathname = pathname.substring(1);
      }

      // Decode URL encoding (%5E = ^, %24 = $)
      const decodedKey = decodeURIComponent(pathname);

      return decodedKey;
    } catch (error) {
      console.error('Error extracting S3 key:', error);
      return '';
    }
  }



  openPdfDocument(candidate: Candidate) {
    if (candidate.reportUrl != null && candidate.reportUrl !== '') {
      this.docUrl = this.extractS3KeyFromUrl(candidate.reportUrl);
      console.log('Extracted S3 Key:', this.docUrl);
      const fileExtension = this.docUrl.split('.').pop()?.toLowerCase();

      if (fileExtension === 'pdf') {
        this.fileType = 'pdf';
      } else if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
        this.fileType = 'image';
      } else {
        this.fileType = 'document';
      }

      // Show modal
      setTimeout(() => {
        this.showPdfModal = true;

      }, 500);



      // Set file type based on file extension

    }
    else {
      this.toastr.error('Report URL is not available for this candidate.', 'Error');
      return
    }
  }

  //   encryptDataAES(data: string): string {
  //   // Encrypt the data using AES with ECB mode and PKCS5 padding
  //   const encrypted = CryptoJS.AES.encrypt(
  //     CryptoJS.enc.Utf8.parse(data), // Data to be encrypted
  //     CryptoJS.enc.Utf8.parse(secret), // Secret key
  //     {
  //       mode: CryptoJS.mode.ECB, // ECB mode
  //       padding: CryptoJS.pad.Pkcs7 // PKCS5 padding is Pkcs7 in CryptoJS
  //     }
  //   );

  //   // Return the encrypted data as a Base64 encoded string
  //   return encrypted.toString();
  // }

  // decryptDataAES(encryptedData: string): string {
  //   // Decrypt the Base64 encoded string
  //   const decrypted = CryptoJS.AES.decrypt(
  //     encryptedData,
  //     CryptoJS.enc.Utf8.parse(secret),
  //     {
  //       mode: CryptoJS.mode.ECB,
  //       padding: CryptoJS.pad.Pkcs7
  //     }
  //   );

  //   // Return the decrypted data as a UTF-8 string
  //   return decrypted.toString(CryptoJS.enc.Utf8);
  // }

  viewPdf(fileKeyOrUrl: string): void {
    // If fileKeyOrUrl is a full S3 link, open directly
    if (fileKeyOrUrl.startsWith('assets')) {
      this.docUrl = fileKeyOrUrl;
      this.showPdfModal = true;
    }
    // If it’s a file key, fetch pre-signed URL from backend
    else {
      const apiUrl = `http://35.154.101.131:8086/api/files/presigned-url?key=${encodeURIComponent(fileKeyOrUrl)}`;
      this.http.get<{ url: string }>(apiUrl).subscribe({
        next: (res) => {
          this.docUrl = res.url;
          this.showPdfModal = true;
        },
        error: (err) => console.error('Error fetching PDF URL', err)
      });
    }
  }



  closeViewer() {
    this.showPdfModal = false;
  }

  /**
   * Called when the bulk-import child component provides a file to import.
   * Accepts a File object (preferred) or a message string.
   */
  importSuccess(fileOrMessage: any) {
    // If a simple string message was passed, treat it as a success message
    if (!fileOrMessage) {
      this.importError = 'No file provided for import.';
      return;
    }

    if (typeof fileOrMessage === 'string') {
      // Child sent a message rather than a file
      this.showSuccessToast(fileOrMessage);
      this.showImportModal = false;
      return;
    }

    const file = fileOrMessage as File;

    // Prepare FormData and call bulk upload API
    const tenantId = 'O9HG0W'; // Replace if dynamic tenant ID is required
    const formData = new FormData();
    formData.append('file', file, file.name);

    this.importLoading = true;
    this.importError = '';

    this.http.post<ApiResponse>(`${environment.apiUrl}/candidates/bulkUpload?tenantId=${tenantId}`, formData).subscribe({
      next: (response) => {
        this.importLoading = false;
        const successCodes = [200, 201, 202, 203, 303];
        if (response && successCodes.includes(response.status.statusCode)) {
          const msg = response.status.statusMessage || 'Candidates imported successfully.';
          this.showSuccessToast(msg);
          this.showImportModal = false;
          // Refresh list after successful import
          this.loadCandidates();
        } else {
          this.importError = response.status.statusMessage || 'Import failed. Please check the file and try again.';
        }
      },
      error: (err) => {
        this.importLoading = false;
        this.importError = err?.error?.message || 'Failed to import file. Please try again.';
        console.error('Bulk import error:', err);
      }
    });
  }

  // Helpers to show/hide the import modal
  openImportModal() {
    this.showImportModal = true;
    this.importError = '';
  }

  closeImportModal() {
    this.showImportModal = false;
    this.importLoading = false;
    this.importError = '';
  }




  initializeCandidateForm() {
    this.candidateForm = this.formBuilder.group({
      candidateId: [''],
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^[6-9][0-9]{9}$/)]],
      emailId: ['', [Validators.required, Validators.email]],
      uan: [''],
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
  loadCandidates() {
    this.loading = true;
    this.error = '';

    const tenantId = sessionStorage.getItem('tenantId'); // Replace with dynamic tenantId if necessary
    this.http.get<ApiResponse>(`${environment.apiUrl}/candidates/getAll?tenantId=${tenantId}`).subscribe({
      next: (response) => {
        console.log('Candidates API Response:', response);

        if (response.status.statusCode === 303 && response.data) {
          if (Array.isArray(response.data)) {
            this.candidates = response.data.map((candidate: Candidate) => ({
              candidateId: candidate.candidateId,
              reportUrl: candidate.reportUrl,
              tenantId: candidate.tenantId,
              firstName: candidate.firstName,
              middleName: candidate.middleName,
              lastName: candidate.lastName,
              fullName: candidate.fullName,
              dateOfBirth: candidate.dateOfBirth,
              gender: candidate.gender,
              mobileNumber: candidate.mobileNumber,
              emailId: candidate.emailId,
              uan: candidate.uan,
              createdOn: candidate.createdOn,
              updatedOn: candidate.updatedOn
            }));
          } else {
            const candidate = response.data as any;
            this.candidates = [{
              reportUrl: candidate.reportUrl,
              candidateId: candidate.candidateId,
              tenantId: candidate.tenantId,
              firstName: candidate.firstName,
              middleName: candidate.middleName,
              lastName: candidate.lastName,
              fullName: candidate.fullName,
              dateOfBirth: candidate.dateOfBirth,
              gender: candidate.gender,
              mobileNumber: candidate.mobileNumber,
              emailId: candidate.emailId,
              uan: candidate.uan,
              createdOn: candidate.createdOn,
              updatedOn: candidate.updatedOn
            }];
          }

          this.applyFilter(); // Apply any existing filter after loading the candidates
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

  openBulkImportModal() {
    this.showImportModal = true;
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


  openAssignCheckModal(candidate: any) {
    this.selectedCandidate = candidate;
    this.assignedCompetencies = [];  // Clear previously assigned competencies

    const payload = {
      candidateId: candidate.candidateId,
      tenantId: sessionStorage.getItem('tenantId')
    };

    // Fetch assigned competencies for the candidate
    this.http.post<any>(`${environment.apiUrl}/candidates/getCandidate`, payload).subscribe((response: any) => {
      if (response.status.statusCode === 311) {
        this.assignedCompetencies = response.data.competencies || [];
        this.showAssignCheckModal = true; // Open the modal
        const modalElement = document.querySelector('.modal');
        if (modalElement) {
          modalElement.setAttribute('aria-hidden', 'false');
        }
      } else {
        console.error('Failed to fetch competencies');
      }
    });


  }
  // Check if a competency is already assigned to the candidate
  isAssignedCompetency(competency: any): boolean {
    return this.assignedCompetencies.some(c => c.competencyName === competency.competencyName);
  }




  closeAssignCheckModal() {
    this.showAssignCheckModal = false;
    const modalElement = document.querySelector('.modal');
    if (modalElement) {
      modalElement.setAttribute('aria-hidden', 'true');
    }
  }

  addCompetencyToTable() {
    if (this.selectedCompetency) {
      const competency = this.competencies.find(c => c.competencyId === this.selectedCompetency);
      if (competency && !this.assignedCompetencies.includes(competency)) {
        this.assignedCompetencies.push(competency); // Add competency to table
        this.selectedCompetency = null; // Reset selection
      }
    }
  }

  assignCompetency(competency: any) {
    if (!this.isAssignedCompetency(competency)) {
      this.assignedCompetencies.push(competency);  // Add to assigned competencies list
    }
  }


  assignCompetencies() {
    const competenciesPayload = this.assignedCompetencies.map((competency) => ({
      competencyName: competency.competencyName,
      competencyId: competency.competencyId.toString(), // Ensure competencyId is a string
      isVerified: false
    }));

    const requestData = {
      tenantId: sessionStorage.getItem('tenantId'),
      candidateId: this.selectedCandidate.candidateId,
      competencies: competenciesPayload
    };

    // Send API request to save assigned competencies
    this.http.post(`${environment.apiUrl}/candidates/saveCompetencyCheck`, requestData).subscribe(
      (response) => {
        console.log('Competencies assigned successfully:', response);
        this.showSuccessToast('Competencies assigned successfully.');
        this.closeAssignCheckModal();
      },
      (error) => {
        console.error('Error assigning competencies:', error);
      }
    );
  }

  // openPdfDocument(candidate: Candidate) {
  //   // Construct the PDF URL - you can modify this based on your URL pattern
  //   const pdfUrl = `https://qz2onj.s3.ap-south-1.amazonaws.com/QZ2ONJ-Iw1q0A/${candidate.firstName}_Report.pdf`;

  //   // Option 1: Open in new tab (simpler approach)
  //   window.open(pdfUrl, '_blank');

  //   // Option 2: Open in modal (if you want to keep the modal approach)
  //   // this.currentCandidate = candidate;
  //   // this.currentPdfUrl = pdfUrl;
  //   // this.showPdfModal = true;
  // }

  closePdfModal() {
    this.showPdfModal = false;
    this.currentPdfUrl = '';
  }

  removeCompetency(competency: any) {
    const index = this.assignedCompetencies.findIndex(
      (c) => c.competencyId === competency.competencyId
    );

    if (index > -1) {
      this.assignedCompetencies.splice(index, 1);
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

    this.candidateError = '';

    // Convert dates for form inputs
    const dobFormatted = candidate.dateOfBirth ? this.formatDateForInput(candidate.dateOfBirth) : '';

    this.candidateForm.setValue({
      candidateId: displayCandidateId,
      firstName: candidate.firstName || '',
      middleName: candidate.middleName || '',
      lastName: candidate.lastName || '',
      dateOfBirth: dobFormatted,
      gender: candidate.gender || '',
      mobileNumber: candidate.mobileNumber || '',
      emailId: candidate.emailId || '',
      uan: candidate.uan || '',
      // active: candidate.active !== undefined ? candidate.active : true,
      // createdBy: candidate.createdBy || 'system',
      // updatedBy: 'system'
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

  closeBulkImportModal() {
    this.showImportModal = false;
    this.importError = '';
    this.importLoading = false;
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
        if (fieldName === 'mobileNumber') {
          return 'Please enter a valid 10-digit mobileNumber number';
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
      'mobileNumber': 'Mobile Number',
      'emailId': 'Email ID',
      'dateOfJoining': 'Date of Joining',
      'caseReceiveDate': 'Case Receive Date',
      'employeeId': 'Employee ID',
      'location': 'Location',
      'uan': 'UAN',
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
        return 'badge badge-pill badge-soft-primary font-size-11';
      case 'FEMALE':
        return 'badge badge-pill badge-soft-success font-size-11';
      case 'OTHER':
        return 'badge badge-pill badge-soft-info font-size-11';
      default:
        return 'badge badge-pill badge-soft-secondary font-size-11';
    }
  }

  // Get employment type badge class
  getEmploymentTypeBadgeClass(empType: string): string {
    switch (empType?.toUpperCase()) {
      case 'PRE_EMPLOYMENT':
        return 'badge badge-pill badge-soft-warning font-size-11';
      case 'POST_EMPLOYMENT':
        return 'badge badge-pill badge-soft-info font-size-11';
      default:
        return 'badge badge-pill badge-soft-secondary font-size-11';
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



  onSubmit() {
    // if (this.candidateForm.invalid) {
    //   Object.keys(this.candidateForm.controls).forEach(key => {
    //     this.candidateForm.get(key)?.markAsTouched();
    //   });
    //   this.candidateError = 'Please fix the errors in the form before submitting.';
    //   return;
    // }

    this.candidateLoading = true;
    this.candidateError = '';

    // Prepare payload with only filled values
    const formValues = this.candidateForm.value;
    const payload: any = {};

    Object.keys(formValues).forEach(key => {
      const value = formValues[key];
      if (value !== null && value !== undefined && value !== '') {
        payload[key] = value;
      }
    });

    if (this.isEditMode) {
      this.updateCandidate(payload);
    } else {
      this.createCandidate(payload);
    }
  }

  createCandidate(payload: any) {
    const tenantId = sessionStorage.getItem('tenantId'); // Replace with dynamic tenantId if necessary
    this.http.post<ApiResponse>(`${environment.apiUrl}/candidates/create`, {
      tenantId,
      ...payload
    }).subscribe({
      next: (response) => {
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


  updateCandidate(payload: any) {
    const tenantId = sessionStorage.getItem('tenantId'); // Replace with dynamic tenantId if necessary
    this.http.put<ApiResponse>(`${environment.apiUrl}/candidates/update`, {
      tenantId,
      candidateId: payload.candidateId,
      ...payload
    }).subscribe({
      next: (response) => {
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

  deleteCandidate(candidateId: string) {
    const tenantId = 'O9HG0W'; // Replace with dynamic tenantId if necessary
    this.http.post<ApiResponse>(`${environment.apiUrl}/candidates/delete`, {
      tenantId,
      candidateId
    }).subscribe({
      next: (response) => {
        this.loadCandidates();
        this.showSuccessToast('Candidate has been deleted successfully!');
      },
      error: (err) => {
        console.error('Error deleting candidate:', err);
        this.error = err.error?.message || 'Failed to delete candidate.';
      }
    });
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

  uploadFile(candidateId: string, file: File) {
    const tenantId = 'O9HG0W'; // Replace with dynamic tenantId if necessary
    const formData = new FormData();
    formData.append('file', file, file.name);

    this.http.post<ApiResponse>(`http://localhost:8086/file/upload?tenantId=${tenantId}&candidateId=${candidateId}`, formData).subscribe({
      next: (response) => {
        console.log('File upload successful:', response);
        // Handle success (e.g., show a success message or update the UI)
        this.showSuccessToast('File uploaded successfully!');
      },
      error: (err) => {
        console.error('Error uploading file:', err);
        this.uploadError = err.error?.message || 'Failed to upload file.';
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

  onClickCandidateDetails(candidate: Candidate) {
    // Implement the logic to handle candidate details click
    console.log('Candidate details clicked:', candidate);
    this.router.navigate(['/candidate-details', candidate.candidateId || candidate.id]);
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