import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  // We use a signal to manage the locked state of the UI
  readonly isLocked = signal<boolean>(false);

  // Method for the "Launch Test" button
  onLaunchTest(): void {
    this.isLocked.set(true);
    console.log('UI Bloqueada de forma preventiva.');

    // Simulate an asynchronous operation that will unlock the UI after 3 seconds
    setTimeout(() => {
      this.isLocked.set(false);
      console.log('UI Desbloqueada automáticamente.');
    }, 3000);
  }
}
