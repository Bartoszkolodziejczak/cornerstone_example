import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable } from '@angular/core';
import { catchError, EMPTY, filter, from, fromEvent, map, Observable, OperatorFunction, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import * as fflate from 'fflate';
import { Unzipped } from 'fflate';



@Injectable({
  providedIn: 'root'
})
export class DicomApiService {

  worker!: Worker;
  workerMessageObservable!: Observable<MessageEvent<any>>;

  constructor(private http: HttpClient) { }

  public getDicomArchive(vsiObjecURL: string, destroyRef: DestroyRef) {
    this.createWebWorker();
    return this.http.get(vsiObjecURL, { responseType: 'arraybuffer', reportProgress: true }).pipe(
      takeUntilDestroyed(destroyRef),
      switchMap((response) => this.openArchiveSync(response)),
      this.getUnzippedDicoms({ useReadableStreams: true }),
    );
  }

  public getUnzippedDicoms({ useReadableStreams }: { useReadableStreams: boolean; }): OperatorFunction<fflate.Unzipped, { results: any[]; }> {
    return source =>
      source.pipe(
        this.processUsingReadableStream,
        switchMap(() => {
          return this.workerMessageObservable.pipe(
            filter((message: MessageEvent<any[]>) => message.data.length > 0),
            map((message: MessageEvent<any[]>) => ({ results: message.data })),
            catchError(() => { this.clearWorkers(); return EMPTY; }),
          );
        }),
      );
  };

  private openArchiveSync(response: ArrayBuffer): Observable<any> {
    return from(new Promise((resolve, reject) => {
      resolve(fflate.unzipSync(new Uint8Array(response)));
    }));
  }

  private processUsingReadableStream: OperatorFunction<fflate.Unzipped, ChunkedData> = source => {
    return source.pipe(
      tap(() => console.log('processUsingReadableStream')),
      map((unzippedFiles: fflate.Unzipped) => chunkData(unzippedFiles)),
      tap(({ readableStream, desiredChunkSize }: ChunkedData) =>
        // using desiredChunkSize is not available for now - requires attention
        this.worker.postMessage({ type: 'stream', stream: readableStream, ...{ chunkSize: desiredChunkSize ?? undefined } }, [readableStream])
      )
    );
  };

  private createWebWorker() {
    const createWorker = (() => {
      this.worker = new Worker('./assets/webworker-dicom.js');
      this.workerMessageObservable = fromEvent<MessageEvent>(this.worker, 'message');
    })();
  }

  public clearWorkers(): void {
    this.worker.terminate();
  }

}


export function chunkData(unzippedFiles: Unzipped, desiredChunkSize?: any): ChunkedData {
  // Extract Uint8Arrays from the Unzipped object
  const dataArray: Uint8Array[] = Object.values(unzippedFiles);

  // Create a ReadableStream from the array of Uint8Arrays
  const readableStream = createStream(dataArray, desiredChunkSize);

  return { readableStream, desiredChunkSize };
}

export function createStream(data: Uint8Array[], chunkSize?: number): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream({
    start(controller) {

      function push() {
        if (index < data.length) {
          // Push the next chunk of data with controlled chunk size
          const chunk = chunkSize ? data[index].subarray(0, chunkSize) : data[index];
          // Push the next chunk of data
          controller.enqueue(chunk);
          index++;

          // Schedule the next push
          setTimeout(push, 0);
        } else {
          // Signal the end of the stream
          controller.close();
        }
      }

      // Start pushing data
      push();
    },
  });
}

export type ChunkedData = {
  readableStream: ReadableStream<Uint8Array>;
  desiredChunkSize: number;
};