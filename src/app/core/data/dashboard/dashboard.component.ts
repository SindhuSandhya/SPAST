import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

interface Candidate {
  id: string;
  name: string;
  employeeId: string;
  location: string;
  caseDate: string;
  overallStatus: 'COMPLETED' | 'IN-PROGRESS' | 'PENDING' | 'FAILED';
  progress: number;
  verifications: {
    [key: string]: 'completed' | 'pending' | 'failed';
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

interface CompetencyData {
  pendingCount: number;
  verifiedCount: number;
  competencyName: string;
}

interface TenantCasesData {
  tenantId?: string;
  totalCases?: number;
  pendingCases?: number;
  completedCases?: number;
  failedCases?: number;
  inProgressCases?: number;
  casesData?: any[];
}

interface TenantStats {
  tenantName: string;
  totalCases: number;
}

interface AdminDashboardStats {
  totalTenants: number;
  totalCases: number;
  averageCasesPerTenant: number;
  maxCases: number;
  minCases: number;
  activeTenants: number;
  tenantsList: TenantStats[];
}

interface ApiResponse {
  id: string | null;
  status: string | null;
  errors: any | null;
  data: {
    competencies?: CompetencyData[];
  } & TenantCasesData;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule]
})
export class DashboardComponent implements OnInit {

  private apiUrl = 'http://35.154.101.131:8086/dashboard/totalChecksCompleted';
  private tenantId = 'QZ2ONJ';

  dashboardStats: DashboardStats = {
    totalCandidates: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    avgDays: 7,
    completionPercentage: 0,
    pendingPercentage: 0,
    failedPercentage: 0
  };

  adminDashboardStats: AdminDashboardStats = {
    totalTenants: 0,
    totalCases: 0,
    averageCasesPerTenant: 0,
    maxCases: 0,
    minCases: 0,
    activeTenants: 0,
    tenantsList: []
  };

  verificationTypeStats: { [key: string]: VerificationStats } = {};
  // Keep original labels from API (competencyName) for display
  verificationTypeLabels: { [key: string]: string } = {};

  candidates: Candidate[] = [];
  filteredCandidates: Candidate[] = [];
  searchTerm: string = '';
  statusFilter: string = 'All Status';
  isLoading: boolean = false;

  // Chart reference
  root: am5.Root | null = null;
  series: any = null;

  // Map API competency names to display names
  private competencyMapping: { [key: string]: string } = {
    'Profile Basic': 'pan',
    'Mobile 360': 'mobile',
    'Mobile to DL Advance': 'aadhar',
    'Profile Advanced': 'uan',
    'Address Tracing': 'faceRecognition'
  };

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Chart will be initialized after data is loaded and view is ready
    // No action needed here, chart initializes in processTenantStatsArray()
  }

  loadDashboardData(): void {
    this.isLoading = true;
    let url = '';
    const userRole = localStorage.getItem('userRole');
    
    console.log('Dashboard loading for user role:', userRole);
    
    if (userRole === 'super-admin') {
      url = 'http://35.154.101.131:8086/admin/tenant-total-cases';
      console.log('Fetching super-admin data from:', url);
      
      this.http.get<any>(url).subscribe({
        next: (response) => {
          console.log('Super-admin response:', response);
          this.processDashboardData(response);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching dashboard data:', error);
          this.isLoading = false;
        }
      });
    } else {
      url = `${this.apiUrl}?tenantId=${this.tenantId}`;
      console.log('Fetching tenant data from:', url);
      
      this.http.post<ApiResponse>(url, {}).subscribe({
        next: (response) => {
          console.log('Tenant response:', response);
          this.processDashboardData(response);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching dashboard data:', error);
          this.isLoading = false;
        }
      });
    }
  }

  processDashboardData(response: any): void {
    console.log('Processing dashboard data:', response);
    
    if (!response) {
      console.error('Empty response');
      return;
    }

    // Handle different response structures
    let data = response.data || response;
    const userRole = localStorage.getItem('userRole');

    console.log('Extracted data:', data);
    console.log('User role:', userRole);

    // Handle tenant-total-cases response for super-admin (array format)
    if (userRole === 'super-admin' && Array.isArray(data)) {
      console.log('Processing as tenant array data');
      this.processTenantCasesData(data);
      return;
    }

    // Handle tenant-total-cases response for super-admin (object format)
    if (userRole === 'super-admin' && (data.totalCases !== undefined || data.completedCases !== undefined)) {
      console.log('Processing as tenant cases object data');
      this.processTenantCasesData(data);
      return;
    }

    // Handle competencies response for regular users
    if (data.competencies && Array.isArray(data.competencies)) {
      console.log('Processing as competencies data');
      this.processCompetenciesData(data.competencies);
      return;
    }

    console.error('Unknown response format:', data);
  }

  processTenantCasesData(data: any): void {
    console.log('Processing tenant cases data:', data);
    
    // Handle array response containing tenant data
    if (Array.isArray(data)) {
      this.processTenantStatsArray(data);
      return;
    }

    // Handle single object response (fallback)
    this.dashboardStats.totalCandidates = parseInt(data.totalCases) || 0;
    this.dashboardStats.completed = parseInt(data.completedCases) || 0;
    this.dashboardStats.pending = parseInt(data.pendingCases) || 0;
    this.dashboardStats.failed = parseInt(data.failedCases) || 0;

    console.log('Updated stats:', this.dashboardStats);

    // Calculate percentages
    const total = this.dashboardStats.totalCandidates;
    if (total > 0) {
      this.dashboardStats.completionPercentage = Math.round((this.dashboardStats.completed / total) * 100);
      this.dashboardStats.pendingPercentage = Math.round((this.dashboardStats.pending / total) * 100);
      this.dashboardStats.failedPercentage = Math.round((this.dashboardStats.failed / total) * 100);
    }

    this.filteredCandidates = [...this.candidates];
  }

  processTenantStatsArray(tenantData: TenantStats[]): void {
    console.log('Processing tenant stats array:', tenantData);

    // Calculate statistics
    const totalTenants = tenantData.length;
    const totalCases = tenantData.reduce((sum, tenant) => sum + (tenant.totalCases || 0), 0);
    const activeTenants = tenantData.filter(tenant => tenant.totalCases > 0).length;
    const casesArray = tenantData.map(t => t.totalCases).filter(c => c !== undefined && c !== null);
    
    const maxCases = casesArray.length > 0 ? Math.max(...casesArray) : 0;
    const minCases = casesArray.length > 0 ? Math.min(...casesArray) : 0;
    const averageCasesPerTenant = totalTenants > 0 ? Math.round(totalCases / totalTenants * 100) / 100 : 0;

    // Update admin dashboard stats
    this.adminDashboardStats = {
      totalTenants,
      totalCases,
      averageCasesPerTenant,
      maxCases,
      minCases,
      activeTenants,
      tenantsList: tenantData
    };

    console.log('Admin dashboard stats:', this.adminDashboardStats);

    // Initialize bar chart
    this.initializeTenantBarChart(tenantData);
  }

  initializeTenantBarChart(tenantData: TenantStats[]): void {
    console.log('Initializing tenant bar chart');

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      // Dispose existing chart if it exists
      if (this.root) {
        this.root.dispose();
        this.root = null;
      }

      // Create root element
      const chartDiv = document.getElementById('tenantChartDiv');
      if (!chartDiv) {
        console.error('Chart container not found. Make sure div with id "tenantChartDiv" exists in the template');
        return;
      }

      console.log('Chart container found, initializing chart');

      try {
        // Create root
        this.root = am5.Root.new(chartDiv);

        // Apply theme
        this.root.setThemes([
          am5themes_Animated.new(this.root)
        ]);

        // Create chart instance
        const chart = this.root.container.children.push(
          am5xy.XYChart.new(this.root, {})
        );

        // Create axes
        const xRenderer = am5xy.AxisRendererX.new(this.root, {});
        xRenderer.grid.template.setAll({
          strokeOpacity: 0.1
        });

        const xAxis = chart.xAxes.push(
          am5xy.CategoryAxis.new(this.root, {
            categoryField: 'tenantName',
            renderer: xRenderer,
            tooltip: am5.Tooltip.new(this.root, {})
          })
        );

        xAxis.data.setAll(tenantData);

        // Set label text and rotation for better readability
        xAxis.get('renderer').labels.template.setAll({
          rotation: -45,
          centerX: am5.percent(100),
          centerY: am5.percent(0)
        });

        const yRenderer = am5xy.AxisRendererY.new(this.root, {});
        yRenderer.grid.template.setAll({
          strokeOpacity: 0.1
        });

        const yAxis = chart.yAxes.push(
          am5xy.ValueAxis.new(this.root, {
            min: 0,
            renderer: yRenderer
          })
        );

        // Create series
        this.series = chart.series.push(
          am5xy.ColumnSeries.new(this.root, {
            name: 'Total Cases',
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: 'totalCases',
            categoryXField: 'tenantName'
          })
        );

        // Set colors dynamically
        this.series.columns.template.setAll({
          strokeOpacity: 0,
          radarColumn: true,
          tooltipText: '{tenantName}: {value}'
        });

        // Color the columns
        this.series.columns.template.adapters.add('fill', (fill, target) => {
          const dataItem = target.dataItem;
          if (dataItem) {
            const totalCases = dataItem.get('totalCases') as number;
            if (totalCases > 10) {
              return am5.color(0x2ecc74); // Green for high cases
            } else if (totalCases > 5) {
              return am5.color(0x3498db); // Blue for medium cases
            } else if (totalCases > 0) {
              return am5.color(0xf39c12); // Orange for low cases
            } else {
              return am5.color(0x2ecc71); // Gray for zero cases
            }
          }
          return fill;
        });

        this.series.data.setAll(tenantData);

        // Add cursor
        const cursor = chart.set('cursor', am5xy.XYCursor.new(this.root, {
          behavior: 'zoomX'
        }));

        // Animate on load
        this.series.appear(1000, 100);
        chart.appear(1000, 100);

        console.log('Chart initialized successfully');
      } catch (error) {
        console.error('Error initializing chart:', error);
      }
    }, 100); // Small delay to ensure DOM is ready
  }

  processCompetenciesData(competencies: CompetencyData[]): void {
    // Initialize verification stats
    this.verificationTypeStats = {};

    // Calculate total candidates and stats
    let totalVerified = 0;
    let totalPending = 0;

    competencies.forEach((comp: CompetencyData) => {
      const mappedName = this.competencyMapping[comp.competencyName] || comp.competencyName.toLowerCase().replace(/\s+/g, '');

      this.verificationTypeStats[mappedName] = {
        completed: comp.verifiedCount,
        pending: comp.pendingCount,
        failed: 0 // API doesn't provide failed count, defaulting to 0
      };

      // Store the original competencyName for display (label)
      this.verificationTypeLabels[mappedName] = comp.competencyName;

      totalVerified += comp.verifiedCount;
      totalPending += comp.pendingCount;
    });

    // Assuming each competency check represents a unique candidate
    // You may need to adjust this logic based on your actual data structure
    const totalCandidates = Math.max(
      ...competencies.map(c => c.verifiedCount + c.pendingCount)
    );

    // Update dashboard stats
    this.dashboardStats.totalCandidates = totalCandidates;
    this.dashboardStats.completed = competencies.filter(c => c.verifiedCount > 0 && c.pendingCount === 0).length;
    this.dashboardStats.pending = competencies.filter(c => c.pendingCount > 0).length;
    this.dashboardStats.failed = 0; // No failed data from API

    // Calculate percentages
    if (totalCandidates > 0) {
      this.dashboardStats.completionPercentage = Math.round((this.dashboardStats.completed / totalCandidates) * 100);
      this.dashboardStats.pendingPercentage = Math.round((this.dashboardStats.pending / totalCandidates) * 100);
      this.dashboardStats.failedPercentage = 0;
    }

    // Generate sample candidate data based on API response
    this.generateCandidateData(competencies);
    this.filteredCandidates = [...this.candidates];
  }

  generateCandidateDataFromTenantCases(casesData: any[]): void {
    this.candidates = casesData.map((caseItem: any, index: number) => ({
      id: caseItem.id || `case-${index}`,
      name: caseItem.candidateName || caseItem.name || `Candidate ${index + 1}`,
      employeeId: caseItem.employeeId || 'N/A',
      location: caseItem.location || 'N/A',
      caseDate: caseItem.caseDate || caseItem.createdDate || new Date().toISOString(),
      overallStatus: this.mapCaseStatus(caseItem.status),
      progress: this.calculateProgress(caseItem),
      verifications: {}
    }));
  }

  private mapCaseStatus(status: string): 'COMPLETED' | 'IN-PROGRESS' | 'PENDING' | 'FAILED' {
    if (!status) return 'PENDING';
    const normalizedStatus = status.toUpperCase();
    if (normalizedStatus.includes('COMPLETED')) return 'COMPLETED';
    if (normalizedStatus.includes('IN_PROGRESS') || normalizedStatus.includes('INPROGRESS')) return 'IN-PROGRESS';
    if (normalizedStatus.includes('FAILED')) return 'FAILED';
    return 'PENDING';
  }

  private calculateProgress(caseItem: any): number {
    // Calculate progress based on case status or other metrics
    const status = this.mapCaseStatus(caseItem.status);
    switch (status) {
      case 'COMPLETED':
        return 100;
      case 'IN-PROGRESS':
        return caseItem.progress || 50;
      case 'PENDING':
        return 0;
      case 'FAILED':
        return 0;
      default:
        return 0;
    }
  }

  generateCandidateData(competencies: CompetencyData[]): void {
    // This generates sample candidates based on the verification data
    // In a real scenario, you'd have a separate API endpoint for candidate details
    this.candidates = [];

    const maxCandidates = Math.max(
      ...competencies.map(c => c.verifiedCount + c.pendingCount)
    );

    for (let i = 0; i < maxCandidates; i++) {
      const verifications: { [key: string]: 'completed' | 'pending' | 'failed' } = {};
      let completedCount = 0;

      competencies.forEach((comp) => {
        const mappedName = this.competencyMapping[comp.competencyName] || comp.competencyName.toLowerCase().replace(/\s+/g, '');

        if (i < comp.verifiedCount) {
          verifications[mappedName] = 'completed';
          completedCount++;
        } else if (i < comp.verifiedCount + comp.pendingCount) {
          verifications[mappedName] = 'pending';
        } else {
          verifications[mappedName] = 'completed';
          completedCount++;
        }
      });

      const progress = Math.round((completedCount / competencies.length) * 100);
      let status: 'COMPLETED' | 'IN-PROGRESS' | 'PENDING' | 'FAILED';

      if (progress === 100) status = 'COMPLETED';
      else if (progress >= 50) status = 'IN-PROGRESS';
      else status = 'PENDING';

      this.candidates.push({
        id: (i + 1).toString(),
        name: `Candidate ${i + 1}`,
        employeeId: `EMP${String(i + 1).padStart(3, '0')}`,
        location: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'][i % 5],
        caseDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        overallStatus: status,
        progress: progress,
        verifications: verifications
      });
    }
  }

  filterCandidates(): void {
    this.filteredCandidates = this.candidates.filter(candidate => {
      const matchesSearch = candidate.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        candidate.employeeId.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = this.statusFilter === 'All Status' ||
        candidate.overallStatus === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

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

  getProgressClass(progress: number): string {
    if (progress === 100) return 'bg-success';
    if (progress >= 60) return 'bg-info';
    if (progress >= 20) return 'bg-warning';
    return 'bg-danger';
  }

  exportReport(): void {
    console.log('Exporting report...');
    // Implement export logic here
  }

  refreshData(): void {
    console.log('Refreshing data...');
    this.loadDashboardData();
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getAvatarClass(index: number): string {
    const colors = ['bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger'];
    return colors[index % colors.length];
  }

  viewCandidate(candidate: Candidate): void {
    console.log('View candidate:', candidate);
  }

  editCandidate(candidate: Candidate): void {
    console.log('Edit candidate:', candidate);
  }

  deleteCandidate(candidate: Candidate): void {
    console.log('Delete candidate:', candidate);
  }

  // Helper method to get verification stats keys for display
  getVerificationKeys(): string[] {
    return Object.keys(this.verificationTypeStats);
  }

  // Helper method to get display name for verification type
  getVerificationDisplayName(key: string): string {
    const displayNames: { [key: string]: string } = {
      'pan': 'PAN Verification',
      'aadhar': 'Aadhar Verification',
      'mobile': 'Mobile Verification',
      'uan': 'UAN Verification',
      'faceRecognition': 'Face Recognition'
    };
    return displayNames[key] || key;
  }

  // Helper method to get icon for verification type
  getVerificationIcon(key: string): string {
    const icons: { [key: string]: string } = {
      'pan': 'mdi-card-account-details',
      'aadhar': 'mdi-card-account-details-outline',
      'mobile': 'mdi-cellphone',
      'uan': 'mdi-bank',
      'faceRecognition': 'mdi-face-recognition'
    };
    return icons[key] || 'mdi-check-circle';
  }

  // Helper method to get color class for verification type
  getVerificationColorClass(key: string): string {
    const colors: { [key: string]: string } = {
      'pan': 'primary',
      'aadhar': 'info',
      'mobile': 'warning',
      'uan': 'secondary',
      'faceRecognition': 'dark'
    };
    return colors[key] || 'primary';
  }
}