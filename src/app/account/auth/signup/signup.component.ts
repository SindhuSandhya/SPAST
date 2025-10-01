import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { AuthenticationService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { UserProfileService } from '../../../core/services/user.service';
import { Store } from '@ngrx/store';
import { Register } from 'src/app/store/Authentication/authentication.actions';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DuplicateCheckService } from 'src/app/core/services/duplicateService.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class SignupComponent implements OnInit {

  signupForm: UntypedFormGroup;
  submitted: boolean = false;
  error: string = '';
  successmsg: string = '';

  // set the current year
  year: number = new Date().getFullYear();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private userService: UserProfileService,
    public store: Store,
    private http: HttpClient,
    private duplicateCheckService: DuplicateCheckService
  ) { }

  ngOnInit() {
    this.signupForm = this.formBuilder.group({
      companyName: ['', [Validators.required]],
      typeOfEstablishment: ['', [Validators.required]],
      address: ['', [Validators.required]],
      cin: [''],
      gstNo: ['', {
        validators: [Validators.required, Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)],
        asyncValidators: [this.duplicateCheckService.checkGst.bind(this.duplicateCheckService)],
        updateOn: 'blur'
      }],
      pan: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]],
      contactPersonName: ['', [Validators.required]],
      contactEmail: ['', {
        validators: [Validators.required, Validators.email],
        asyncValidators: [this.duplicateCheckService.checkEmail.bind(this.duplicateCheckService)],
        updateOn: 'blur'
      }],
      contactPhoneNumber: ['', {
        validators: [Validators.required, Validators.pattern(/^[6-9][0-9]{9}$/)],
        asyncValidators: [this.duplicateCheckService.checkPhoneNumber.bind(this.duplicateCheckService)],
        updateOn: 'blur'
      }],
      createdBy: ['AdminUser']
    });
  }

  // convenience getter for easy access to form fields
  get f() { return this.signupForm.controls; }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  // Get error message for a field
  getFieldError(fieldName: string): string {
    const field = this.signupForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched || this.submitted)) {
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
      if (field.errors['gstExists']) {
        return 'This GST number is already registered';
      }
      if (field.errors['emailExists']) {
        return 'This email address is already registered';
      }
      if (field.errors['phoneExists']) {
        return 'This phone number is already registered';
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
  hasFieldError(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.errors && (field.dirty || field.touched || this.submitted));
  }

  // Check if field is validating (pending async validation)
  isFieldValidating(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.pending);
  }

  /**
   * On submit form
   */
  onSubmit() {
    this.submitted = true;
    this.error = '';
    this.successmsg = '';

    // Mark all fields as touched to show validation errors
    Object.keys(this.signupForm.controls).forEach(key => {
      this.signupForm.get(key)?.markAsTouched();
    });

    if (this.signupForm.invalid) {
      this.error = 'Please fix the errors in the form before submitting.';
      return;
    }

    // Check if any async validations are still pending
    if (this.signupForm.pending) {
      this.error = 'Please wait for validation to complete.';
      return;
    }

    const payload = this.signupForm.getRawValue();

    this.http.post(`${environment.apiUrl}/tenant/createTenant`, payload).subscribe({
      next: (response) => {
        this.successmsg = '🎉 Registration successful!';
        this.error = '';
        this.submitted = false;
        setTimeout(() => this.router.navigate(['/tenants']), 2000); // navigate after 2 sec
      },
      error: (err) => {
        console.error('Registration error:', err);
        this.error = err.error?.message || '❌ Registration failed. Please try again.';
        this.successmsg = '';
        this.submitted = false;
      }
    });
  }
}