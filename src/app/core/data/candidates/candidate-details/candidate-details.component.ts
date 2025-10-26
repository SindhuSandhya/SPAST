import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { NgStepperModule } from 'angular-ng-stepper';
import { ActivatedRoute } from '@angular/router';

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

  constructor(private http: HttpClient,
    private route: ActivatedRoute
  ) {}

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

  /**
   * Format the competencies to normalize structure
   * so nested data like addresses and phones display properly.
   */
  private formatCompetencies() {
    this.competencies = this.competencies.map((comp) => {
      const details = { ...comp.details };

      // Flatten address arrays (Profile Advanced)
      if (Array.isArray(details.addresses)) {
        details.addresses = details.addresses.map((a: any) => ({
          address: a.detailed_address,
          pincode: a.pincode,
          state: a.state,
        }));
      }

      // Flatten phone arrays
      if (Array.isArray(details.phones)) {
        details.phones = details.phones.map((p: any) => p.value);
      }

      return { ...comp, details };
    });
  }
}
