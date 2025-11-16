import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { NgStepperModule } from 'angular-ng-stepper';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-candidate-details',
  standalone: true,
  providers: [CdkStepper],
  imports: [CommonModule, HttpClientModule, CdkStepperModule, NgStepperModule],
  templateUrl: './candidate-details.component.html',
  styleUrls: ['./candidate-details.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CandidateDetailsComponent implements OnInit {
  candidateDetails: any = null;
  competencies: any[] = [];
  candidate: any = null;

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.candidate = this.route.snapshot.paramMap.get('candidateId') || '';
    const payload = { candidateId: this.candidate, tenantId: sessionStorage.getItem('tenantId') };

    this.http
      .post('http://35.154.101.131:8086/candidates/getCandidate', payload)
      .subscribe((res: any) => {
        this.candidateDetails = res?.data?.candidateDetails;
        this.competencies = res?.data?.competencies || [];
        this.formatCompetencies();
      });
  }

  onBackClick(){
    this.router.navigate(['/candidates']);
  }

  /**
   * Format the competencies to normalize structure
   * so nested data like addresses and phones display properly.
   */
 /**
 * Format the competencies to normalize structure
 * so nested data like addresses and phones display properly.
 */
private formatCompetencies() {
  this.competencies = this.competencies.map((comp) => {
    const details = { ...comp.details };

    // Special handling for Address Tracing - preserve raw addresses
    if (comp.competencyName === 'Address Tracing' && Array.isArray(details.addresses)) {
      details.rawAddresses = [...details.addresses]; // Keep original structure
    }

    // Handle Profile Advanced and Profile Basic addresses
    if ((comp.competencyName === 'Profile Advanced' || comp.competencyName === 'Profile Basic') 
        && Array.isArray(details.addresses)) {
      details.addresses = details.addresses.map((a: any) => ({
        address: a.detailed_address || `${a.address1 || ''} ${a.address2 || ''}`,
        pincode: a.pincode,
        state: a.state,
        date_of_reporting: a.date_of_reporting,
      }));
    }

    // Handle phone numbers
    if (Array.isArray(details.phones)) {
      details.phones = details.phones.map((p: any) => p.value || p);
    }

    // Flatten user_address for DL
    if (details.user_address && Array.isArray(details.user_address)) {
      // Keep the original structure, don't flatten
      details.user_address = details.user_address.map((addr: any) => ({
        ...addr,
        completeAddress: addr.completeAddress || `${addr.addressLine1}, ${addr.district}, ${addr.state}, ${addr.country}`
      }));
    }

    return { ...comp, details };
  });
}
}
