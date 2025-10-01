import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layouts/layout.component';
import { UsersComponent } from './core/data/users/users.component';
import { TenantsComponent } from './core/data/tenants/tenants.component';
import { CandidatesComponent } from './core/data/candidates/candidates.component';
import { DashboardComponent } from './core/data/dashboard/dashboard.component';
import { AuthGuardService } from './core/helpers/auth.interceptor';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: "auth",
        loadChildren: () =>
            import("./account/account.module").then((m) => m.AccountModule),
    },
    {
        path: "",
        component: LayoutComponent,
        children: [{
            path: "users",
            component: UsersComponent,
            canActivate: [AuthGuard]
        },
        {
            path: "tenants",
            component: TenantsComponent,
            canActivate: [AuthGuard]
        },
        {
            path: "candidates",
            component: CandidatesComponent,
            canActivate: [AuthGuard]
        },
        {
            path: "dashboard",
            component: DashboardComponent,
            canActivate: [AuthGuard]
        }
        ]
    },
    // { path: "**", component: Page404Component },
];
