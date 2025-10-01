import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthenticationService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { SlickCarouselModule } from 'ngx-slick-carousel';

@Component({
  selector: 'app-recoverpwd2',
  templateUrl: './recoverpwd2.component.html',
  styleUrls: ['./recoverpwd2.component.scss'],
  standalone:true,
  imports:[CommonModule,FormsModule,ReactiveFormsModule,SlickCarouselModule]
})
export class Recoverpwd2Component implements OnInit {

  // set the currenr year
  year: number = new Date().getFullYear();

  resetForm: UntypedFormGroup;
  submitted: boolean = false;
  error: any = '';
  success: any = '';
  loading: any = false;

  constructor(private formBuilder: UntypedFormBuilder, private route: ActivatedRoute, private router: Router, private authenticationService: AuthenticationService) { }

  ngOnInit(): void {
    this.resetForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  // convenience getter for easy access to form fields
  get f() { return this.resetForm.controls; }

  /**
   * On submit form
   */
  onSubmit() {
    this.success = '';
    this.error = '';
    this.submitted = true;
    this.loading = true;

    // stop here if form is invalid
    if (this.resetForm.invalid) {
      this.loading = false;
      return;
    }
    if (environment.defaultauth === 'firebase') {
      this.authenticationService.resetPassword(this.f.email.value)
        .then(() => {
          this.success = 'Password reset email sent successfully.';
          this.loading = false;
        })
        .catch(error => {
          this.error = error ? error : 'An error occurred.';
          this.loading = false;
        });
    } else {
      this.error = 'Password reset is only available for Firebase authentication.';
      this.loading = false;
    }
  }
  // swiper config
  slideConfig = {
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    dots: true
  };
}
