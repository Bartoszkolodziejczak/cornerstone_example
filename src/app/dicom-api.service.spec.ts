/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { DicomApiService } from './dicom-api.service';

describe('Service: DicomApi', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DicomApiService]
    });
  });

  it('should ...', inject([DicomApiService], (service: DicomApiService) => {
    expect(service).toBeTruthy();
  }));
});
