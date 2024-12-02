import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { init as coreInit, Enums, RenderingEngine, setVolumesForViewports, volumeLoader } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'cornerstone-example';



  async ngOnInit(): Promise<void> {
    await coreInit();
    await dicomImageLoaderInit();


    const content = document.getElementById('content');

    const viewportGrid = document.createElement('div');
    viewportGrid.style.display = 'flex';
    viewportGrid.style.flexDirection = 'row';

    // element for axial view
    const element1 = document.createElement('div');
    element1.style.width = '500px';
    element1.style.height = '500px';

    // element for sagittal view
    const element2 = document.createElement('div');
    element2.style.width = '500px';
    element2.style.height = '500px';

    viewportGrid.appendChild(element1);
    viewportGrid.appendChild(element2);

    content!.appendChild(viewportGrid);

    const renderingEngineId = 'myRenderingEngine';
    const renderingEngine = new RenderingEngine(renderingEngineId);

    const volumeId = 'myVolume';

    // Define a volume in memory

    // Get Cornerstone imageIds and fetch metadata into RAM
    // const imageIds = await createImageIdsAndCacheMetaData({
    //   StudyInstanceUID:
    //     '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
    //   SeriesInstanceUID:
    //     '1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
    //   wadoRsRoot: 'https://d14fa38qiwhyfd.cloudfront.net/dicomweb',
    // });

    // TODO Add urls example from manager
    // const imageUrls = results?.map(image => {
    //   return `wadouri:` + image.fileInMemoryLink;
    // });
    const imageIds: string[] = [];

    const volume = await volumeLoader.createAndCacheVolume(volumeId, { imageIds });

    const viewportId1 = 'CT_AXIAL';
    const viewportId2 = 'CT_SAGITTAL';

    const viewportInput = [
      {
        viewportId: viewportId1,
        element: element1,
        type: 'orthographic',
        defaultOptions: {
          orientation: Enums.OrientationAxis.AXIAL,
        },
      },
      {
        viewportId: viewportId2,
        element: element2,
        type: 'orthographic',
        defaultOptions: {
          orientation: Enums.OrientationAxis.SAGITTAL,
        },
      },
    ];

    renderingEngine.setViewports(viewportInput as any);

    // Set the volume to load
    volume.load();

    setVolumesForViewports(
      renderingEngine,
      [{ volumeId }],
      [viewportId1, viewportId2]
    );

    // Render the image
    renderingEngine.renderViewports([viewportId1, viewportId2]);

  }
}