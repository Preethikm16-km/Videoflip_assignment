import React, { useRef, useState, useEffect } from "react";

const VideoCropper = () => {
  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const cropperRef = useRef(null);

  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropperVisible, setCropperVisible] = useState(false);
  const [metadata, setMetadata] = useState([]);

  useEffect(() => {
    if (cropperVisible) {
      updateCropperSize();
    }
  }, [aspectRatio, cropperVisible]);

  const updateCropperSize = () => {
    if (!cropperVisible) return;

    const video = videoRef.current.getBoundingClientRect();
    const cropper = cropperRef.current;

    const [widthRatio, heightRatio] = aspectRatio.split(":").map(Number);
    const cropHeight = video.height;
    const cropWidth = (cropHeight * widthRatio) / heightRatio;

    cropper.style.height = `${cropHeight}px`;
    cropper.style.width = `${cropWidth}px`;
    setCoordinates({ x: 0, y: 0, width: cropWidth, height: cropHeight });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const video = videoRef.current.getBoundingClientRect();
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      let newX = coordinates.x + dx;
      let newY = coordinates.y + dy;

      const maxX = video.width - coordinates.width;
      const maxY = video.height - coordinates.height;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      setCoordinates({ x: newX, y: newY, width: coordinates.width, height: coordinates.height });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    recordMetadata();
  };

  const syncPreview = () => {
    const canvas = previewRef.current;
    const context = canvas.getContext("2d");
    const video = videoRef.current;

    if (video && context) {
      const scaleX = video.videoWidth / video.clientWidth;
      const scaleY = video.videoHeight / video.clientHeight;

      const { x, y, width, height } = coordinates;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        video,
        x * scaleX,
        y * scaleY,
        width * scaleX,
        height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      syncPreview();
    }, 100);

    return () => clearInterval(interval);
  }, [coordinates]);

//   Record the data with coordinates,timestamp, playbackrate
  const recordMetadata = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const currentTime = video.currentTime;
      const volume = video.volume;
      const playbackRate = video.playbackRate;

      const videoRect = video.getBoundingClientRect();
      const scaleX = video.videoWidth / videoRect.width;
      const scaleY = video.videoHeight / videoRect.height;

      const scaledCoordinates = [
        coordinates.x * scaleX,
        coordinates.y * scaleY,
        coordinates.width * scaleX,
        coordinates.height * scaleY
      ];

      setMetadata((prevData) => [
        ...prevData,
        {
          timeStamp: currentTime,
          coordinates: scaledCoordinates,
          volume: volume,
          playbackRate: playbackRate,
        },
      ]);
    }
  };

  useEffect(() => {
    const video = videoRef.current;

    if (video) {
      const handleTimeUpdate = () => {
        if (cropperVisible) {
          recordMetadata();
        }
      };

      video.addEventListener("timeupdate", handleTimeUpdate);

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
      };
    }
  }, [cropperVisible, coordinates]);

// download the data
  const handleDownloadMetadata = () => {
    const data = JSON.stringify(metadata, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "video-cropper-metadata.json";
    link.click();
  };

  const [previewWidth, previewHeight] = coordinates.width && coordinates.height
    ? [coordinates.width, coordinates.height]
    : [0, 0];

  return (
    <div className="cropper-container" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div className="video-wrapper">
        <video ref={videoRef} src="/assets/videoplayback.mp4" controls />
        {cropperVisible && (
          <div
            ref={cropperRef}
            className="cropper"
            onMouseDown={handleMouseDown}
            style={{
              top: coordinates.y,
              left: coordinates.x,
              width: coordinates.width,
              height: coordinates.height,
            }}
          />
        )}
      </div>

      <div className="preview-wrapper" style={{ width: previewWidth, height: previewHeight }}>
        <canvas ref={previewRef} width={previewWidth} height={previewHeight} />
      </div>

      <div className="aspect-ratio-controls">
        <label>Aspect Ratio:</label>
        <select onChange={(e) => setAspectRatio(e.target.value)} value={aspectRatio}>
          <option value="9:16">9:16</option>
          <option value="16:9">16:9</option>
          <option value="4:3">4:3</option>
          <option value="1:1">1:1</option>
          <option value="4:5">4:5</option>
        </select>
      </div>

      <div className="cropper-controls">
        <button onClick={() => setCropperVisible(true)} disabled={cropperVisible}>Start Cropper</button>
        <button onClick={() => setCropperVisible(false)} disabled={!cropperVisible}>Remove Cropper</button>
        <button onClick={handleDownloadMetadata}>Generate Preview</button>
      </div>
    </div>
  );
};

export default VideoCropper;
