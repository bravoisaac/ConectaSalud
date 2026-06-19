import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then(m => m.RegisterPage),
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./pages/admin/admin.page').then(m => m.AdminPage),
  },
  {
    path: 'app',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'jobs/new',
        loadComponent: () =>
          import('./pages/job-create/job-create.page').then(m => m.JobCreatePage),
      },
      {
        path: 'jobs/:id',
        loadComponent: () =>
          import('./pages/job-detail/job-detail.page').then(m => m.JobDetailPage),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./pages/jobs/jobs.page').then(m => m.JobsPage),
      },
      {
        path: 'health',
        loadComponent: () =>
          import('./pages/health/health.page').then(m => m.HealthPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.page').then(m => m.ProfilePage),
      },
      {
        path: 'profile-setup',
        loadComponent: () =>
          import('./pages/profile-setup/profile-setup.page').then(m => m.ProfileSetupPage),
      },
      {
        path: 'health-bookings',
        loadComponent: () =>
          import('./pages/health-bookings/health-bookings.page').then(m => m.HealthBookingsPage),
      },
      {
        path: 'my-proposals',
        loadComponent: () =>
          import('./pages/my-proposals/my-proposals.page').then(m => m.MyProposalsPage),
      },
      {
        path: 'chats',
        loadComponent: () =>
          import('./pages/chats/chats.page').then(m => m.ChatsPage),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'jobs',
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'app/jobs',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
