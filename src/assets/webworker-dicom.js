self.importScripts("./dicomParser.js");

const DICOM_SLICE_NUMBER_TAG = "x00200013";
const DICOM_PIXEL_DATA_TAG = "x7fe00010";

onmessage = function (event) {
  let resultArray = [];
  // Check if the message contains a ReadableStream
  const { stream, chunkSize } = event.data;

  // const stream = event.data.stream;
  if (!stream) {
    try {
      classicWebWorkerMessageHandler(event);
    } catch {
      throw new Error("Data stream was not provided for the worker. Or stream was corrupted");
    }
    return;
  }

  // Define a function to process each chunk
  const processChunk = async (chunk, chunkSize) => {
    if (chunk?.length === 0) {
      return;
    }

    const imageIndex = self.dicomParser.parseDicom(chunk).string(DICOM_SLICE_NUMBER_TAG);
    const blob = new Blob([chunk], { type: "application/dicom" });
    const processedObject = {
      imageIndex,
      fileInMemoryLink: self.URL.createObjectURL(blob),
    };

    resultArray.push(processedObject);
  };
  let processNextChunk = () => {};

  if (chunkSize) {
    // Buffer to accumulate chunks
    let buffer = new Uint8Array(0);
    // Process the stream in chunks
    const reader = stream.getReader();
    processNextChunk = async () => {
      const { value, done } = await reader.read();

      // calculateFileSize(value);
      if (!done) {
        // Accumulate the chunk in the buffer
        buffer = concatenateUint8Arrays(buffer, value);

        // Continue processing the next chunk
        processNextChunk();
      } else {
        // Reset the buffer
        buffer = new Uint8Array(0);
        // Process the entire accumulated buffer
        await processChunk(buffer);

        // Signal the end of processing
        postMessage(resultArray.sort((a, b) => a.imageIndex - b.imageIndex));
        resultArray = null;
      }
    };
  } else {
    const reader = stream.getReader();
    processNextChunk = async () => {
      const { value, done } = await reader.read();
      // calculateFileSize(value);
      if (!done) {
        await processChunk(value);
        // Continue processing next chunk
        processNextChunk();
      } else {
        // Signal the end of processing
        postMessage(resultArray.sort((a, b) => a.imageIndex - b.imageIndex));
        resultArray = null;
      }
    };
  }

  // Start processing the stream
  processNextChunk();
};

// Function to concatenate two Uint8Arrays
function concatenateUint8Arrays(a, b) {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

function classicWebWorkerMessageHandler(event) {
  Object.entries(event.data).forEach(([path, fileData], i) => {
    const imageIndex = self.dicomParser.parseDicom(fileData).string(DICOM_SLICE_NUMBER_TAG);
    const blob = new Blob([fileData], { type: "application/dicom" });
    const processedObject = {
      imageIndex,
      fileInMemoryLink: self.URL.createObjectURL(blob),
    };
    resultArray.push(processedObject);
  });
  postMessage(resultArray.sort((a, b) => a.imageIndex - b.imageIndex));
  resultArray = null;
}

function calculateFileSize(file) {
  const fileSizeInMB = file && file?.length / 1_048_576;
  console.log({ sizeInMB: fileSizeInMB });
}
