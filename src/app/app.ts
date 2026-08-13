import { AfterViewInit, Component, HostListener, OnDestroy, signal } from '@angular/core';
import { Dashboard } from './components/dashboard/dashboard';

interface NavLink {
  id: string;
  label: string;
}

@Component({
  selector: 'app-root',
  imports: [Dashboard],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit, OnDestroy {
  readonly navLinks: NavLink[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'educacion', label: 'Educación' },
    { id: 'experiencia', label: 'Experiencia' },
    { id: 'proyectos', label: 'Proyectos' },
    { id: 'demo-section', label: 'Deploy Lab' },
    { id: 'contacto', label: 'Contacto' },
  ];

  readonly activeSection = signal('inicio');
  readonly menuOpen = signal(false);
  readonly scrolled = signal(false);

  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    this.setupScrollSpy();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  navigate(id: string): void {
    this.menuOpen.set(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  private setupScrollSpy(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const sections = this.navLinks
      .map((link) => document.getElementById(link.id))
      .filter((el): el is HTMLElement => !!el);

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.activeSection.set(entry.target.id);
          }
        }
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );

    sections.forEach((section) => this.observer?.observe(section));
  }
}
