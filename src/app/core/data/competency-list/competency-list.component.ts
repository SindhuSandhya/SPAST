import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Competency {
  competencyId: string;
  competencyName: string;
  isActive: boolean;
}

@Component({
  selector: 'app-competency-list',
  templateUrl: './competency-list.component.html',
  styleUrls: ['./competency-list.component.css'],
  imports: [CommonModule,FormsModule],
  standalone: true
})
export class CompetencyListComponent implements OnInit {

  competencies: Competency[] = [];
  loading = false;
  saving = false;
  tenantId = 'QZ2ONJ';

  // Modal controls
  showSaveModal = false;
  showDeleteModal = false;
  showSuccessModal = false;
  selectedCompetency?: Competency;
  successMessage = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchCompetencies();
  }

  /** Fetch master competencies */
  fetchCompetencies() {
    this.loading = true;
    this.http.get<any>('http://35.154.101.131:8086/competencies/getAllCompetencies')
      .subscribe({
        next: (res) => {
          if (res && res.status?.statusCode === 302 && Array.isArray(res.data)) {
            this.competencies = res.data.map((c: any) => ({
              competencyId: c.competencyId,
              competencyName: c.competencyName,
              isActive: true
            }));
          } else {
            this.competencies = [];
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  /** Open save confirmation modal */
  openSaveModal() {
    this.showSaveModal = true;
  }

  /** Confirm save */
  confirmSave() {
    this.showSaveModal = false;
    this.saveCompetencies();
  }

  /** Save all competencies */
  saveCompetencies() {
    if (!this.competencies.length) return;

    this.saving = true;
    const url = `http://35.154.101.131:8086/tenantLevelCompetencies/saveAllCompetencies?tenantId=${this.tenantId}`;
    const payload = this.competencies.map(c => ({
      competencyId: c.competencyId,
      competencyName: c.competencyName,
      isActive: c.isActive === true // ensure boolean true/false
    }));

    console.log('Payload before save:', payload); // 👈 debug log

    this.http.post(url, payload).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Competencies saved successfully.';
        this.showSuccessModal = true;
      },
      error: () => {
        this.saving = false;
        this.successMessage = 'Error saving competencies.';
        this.showSuccessModal = true;
      }
    });
  }

  /** Delete confirmation */
  openDeleteModal(c: Competency) {
    this.selectedCompetency = c;
    this.showDeleteModal = true;
  }

  /** Confirm delete */
  confirmDelete() {
    if (!this.selectedCompetency) return;
    const c = this.selectedCompetency;

    const url = `http://35.154.101.131:8086/tenantLevelCompetencies/deleteCometencys?tenantId=${this.tenantId}`;
    this.http.request('delete', url, { body: { competencyId: c.competencyId } })
      .subscribe({
        next: () => {
          this.competencies = this.competencies.filter(x => x.competencyId !== c.competencyId);
          this.successMessage = `"${c.competencyName}" deleted successfully.`;
          this.showDeleteModal = false;
          this.showSuccessModal = true;
        },
        error: () => {
          this.successMessage = 'Error deleting competency.';
          this.showDeleteModal = false;
          this.showSuccessModal = true;
        }
      });
  }
}
