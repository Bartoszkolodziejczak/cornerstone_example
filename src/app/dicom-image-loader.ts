import * as cornerstone from '@cornerstonejs/core';
import { getConfiguration } from '@cornerstonejs/core';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import dicomParser from 'dicom-parser';

export function initCornerstoneDICOMImageLoader() {
    cornerstoneDICOMImageLoader.external.cornerstone = cornerstone;
    cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;

    // const { preferSizeOverAccuracy, useNorm16Texture } =
    //     cornerstone.getConfiguration().rendering;
    cornerstoneDICOMImageLoader.configure({
        useWebWorkers: true,
        decodeConfig: {
            convertFloatPixelDataToInt: false,
            use16BitDataType: true,
        },
    });

    let maxWebWorkers = 1;

    if (navigator.hardwareConcurrency) {
        maxWebWorkers = Math.min(navigator.hardwareConcurrency, 8);
    }

    var config = {
        maxWebWorkers,
        startWebWorkersOnDemand: true,
        taskConfiguration: {
            decodeTask: {
                initializeCodecsOnStartup: false,
                strict: false,
            },
        },
    };
    cornerstoneDICOMImageLoader.webWorkerManager.initialize(config);
    return cornerstoneDICOMImageLoader;
}

export function destroyImageLoader() {
    cornerstone.cache.purgeCache();
    cornerstone.cache.purgeVolumeCache();
    terminateWebWorker();
}

export function terminateWebWorker() {
    cornerstoneDICOMImageLoader.webWorkerManager.terminate();
}

export const cornerstoneConfiguration = {
    ...getConfiguration(),
    rendering: {
        preferSizeOverAccuracy: true,
        useNorm16Texture: true,
        useCPURendering: false,
        strictZSpacingForVolumeViewport: false
    }
};