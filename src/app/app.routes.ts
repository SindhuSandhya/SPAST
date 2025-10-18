import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layouts/layout.component';
import { UsersComponent } from './core/data/users/users.component';
import { TenantsComponent } from './core/data/tenants/tenants.component';
import { CandidatesComponent } from './core/data/candidates/candidates.component';
import { DashboardComponent } from './core/data/dashboard/dashboard.component';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/auth.guard';
import { CompetencyListComponent } from './core/data/competency-list/competency-list.component';

export const routes: Routes = [
    {
        path: "auth",
        loadChildren: () =>
            import("./account/account.module").then((m) => m.AccountModule),
    },
    {
        path: "",
        component: LayoutComponent,
        children: [
            {
                path: "dashboard",
                component: DashboardComponent,
                canActivate: [AuthGuard], // all logged-in users
            },
            {
                path: "tenants",
                component: TenantsComponent,
                canActivate: [AuthGuard, RoleGuard],
                data: { role: 'super-admin' } // ❗Only super-admin
            },
            {
                path: "users",
                component: UsersComponent,
                canActivate: [AuthGuard, RoleGuard],
                data: { role: 'TenantUser' } // ❗Only TenantUser
            },
            {
                path: "candidates",
                component: CandidatesComponent,
                canActivate: [AuthGuard, RoleGuard],
                data: { role: 'TenantUser' }
            },
            {
                path: 'configuration',
                canActivate: [AuthGuard, RoleGuard],
                data: { role: 'TenantUser' },
                children: [
                    { path: 'competency-list', component: CompetencyListComponent }
                ]
            },
        ]
    },
    // { path: "**", component: Page404Component },
];
