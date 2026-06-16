import { Component, OnDestroy } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UiSettingsService } from './services/ui-settings.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnDestroy {
  routeLoading = false;
  private routerSub: Subscription;
  private loadingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private uiSettings: UiSettingsService,
    private router: Router,
  ) {
    this.uiSettings.init();
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.clearLoadingTimer();
        this.loadingTimer = setTimeout(() => {
          this.routeLoading = true;
        }, 120);
        return;
      }

      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.clearLoadingTimer();
        this.routeLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.clearLoadingTimer();
    this.routerSub.unsubscribe();
  }

  private clearLoadingTimer() {
    if (!this.loadingTimer) {
      return;
    }
    clearTimeout(this.loadingTimer);
    this.loadingTimer = null;
  }
}
