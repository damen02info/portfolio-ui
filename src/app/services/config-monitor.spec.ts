import { TestBed } from '@angular/core/testing';

import { ConfigMonitor } from './config-monitor';

describe('ConfigMonitor', () => {
  let service: ConfigMonitor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigMonitor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
