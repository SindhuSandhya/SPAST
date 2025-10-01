import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

interface Candidate {
  id: string;
  name: string;
  employeeId: string;
  location: string;
  caseDate: string;
  overallStatus: 'COMPLETED' | 'IN-PROGRESS' | 'PENDING' | 'FAILED';
  progress: number;
  verifications: {
    pan: 'completed' | 'pending' | 'failed';
    aadhar: 'completed' | 'pending' | 'failed';
    mobile: 'completed' | 'pending' | 'failed';
    uan: 'completed' | 'pending' | 'failed';
    faceRecognition: 'completed' | 'pending' | 'failed';
  };
}

interface VerificationStats {
  completed: number;
  pending: number;
  failed: number;
}

interface DashboardStats {
  totalCandidates: number;
  completed: number;
  pending: number;
  failed: number;
  avgDays: number;
  completionPercentage: number;
  pendingPercentage: number;
  failedPercentage: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,FormsModule]
})
export class DashboardComponent implements OnInit {

  dashboardStats: DashboardStats = {
    totalCandidates: 5,
    completed: 1,
    pending: 1,
    failed: 1,
    avgDays: 7,
    completionPercentage: 20,
    pendingPercentage: 20,
    failedPercentage: 20
  };

  verificationTypeStats = {
    pan: { completed: 5, pending: 0, failed: 0 },
    aadhar: { completed: 3, pending: 1, failed: 1 },
    mobile: { completed: 4, pending: 1, failed: 0 },
    uan: { completed: 2, pending: 2, failed: 0 },
    faceRecognition: { completed: 1, pending: 3, failed: 0 }
  };

  candidates: Candidate[] = [
    {
      id: '1',
      name: 'John Doe',
      employeeId: 'EMP001',
      location: 'Mumbai',
      caseDate: '15/01/2024',
      overallStatus: 'COMPLETED',
      progress: 100,
      verifications: {
        pan: 'completed',
        aadhar: 'completed',
        mobile: 'completed',
        uan: 'completed',
        faceRecognition: 'completed'
      }
    },
    {
      id: '2',
      name: 'Jane Smith',
      employeeId: 'EMP002',
      location: 'Delhi',
      caseDate: '20/01/2024',
      overallStatus: 'IN-PROGRESS',
      progress: 60,
      verifications: {
        pan: 'completed',
        aadhar: 'completed',
        mobile: 'completed',
        uan: 'pending',
        faceRecognition: 'pending'
      }
    },
    {
      id: '3',
      name: 'Mike Johnson',
      employeeId: 'EMP003',
      location: 'Bangalore',
      caseDate: '25/01/2024',
      overallStatus: 'PENDING',
      progress: 20,
      verifications: {
        pan: 'completed',
        aadhar: 'pending',
        mobile: 'pending',
        uan: 'pending',
        faceRecognition: 'pending'
      }
    }
  ];

  filteredCandidates: Candidate[] = [];
  searchTerm: string = '';
  statusFilter: string = 'All Status';

  constructor() { }

  ngOnInit(): void {
    this.filteredCandidates = [...this.candidates];
  }

  // Filter candidates based on search and status
  filterCandidates(): void {
    this.filteredCandidates = this.candidates.filter(candidate => {
      const matchesSearch = candidate.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           candidate.employeeId.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = this.statusFilter === 'All Status' || 
                           candidate.overallStatus === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  // Get status badge class
  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'badge-soft-success';
      case 'IN-PROGRESS':
        return 'badge-soft-info';
      case 'PENDING':
        return 'badge-soft-warning';
      case 'FAILED':
        return 'badge-soft-danger';
      default:
        return 'badge-soft-secondary';
    }
  }

  // Get verification icon class
  getVerificationIconClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'mdi mdi-check-circle text-success';
      case 'pending':
        return 'mdi mdi-clock-outline text-warning';
      case 'failed':
        return 'mdi mdi-close-circle text-danger';
      default:
        return 'mdi mdi-help-circle text-muted';
    }
  }

  // Get progress bar class
  getProgressClass(progress: number): string {
    if (progress === 100) return 'bg-success';
    if (progress >= 60) return 'bg-info';
    if (progress >= 20) return 'bg-warning';
    return 'bg-danger';
  }

  // Export report functionality
  exportReport(): void {
    console.log('Exporting report...');
    // Implement export logic here
  }

  // Refresh data
  refreshData(): void {
    console.log('Refreshing data...');
    // Implement refresh logic here
    this.ngOnInit();
  }

  // Get candidate initials for avatar
  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  // Get avatar background color
  getAvatarClass(index: number): string {
    const colors = ['bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger'];
    return colors[index % colors.length];
  }

  // Handle row actions
  viewCandidate(candidate: Candidate): void {
    console.log('View candidate:', candidate);
  }

  editCandidate(candidate: Candidate): void {
    console.log('Edit candidate:', candidate);
  }

  deleteCandidate(candidate: Candidate): void {
    console.log('Delete candidate:', candidate);
  }
}