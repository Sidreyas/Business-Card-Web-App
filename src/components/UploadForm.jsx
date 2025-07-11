import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

function UploadForm({ onOcrResult }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Get username from localStorage
  const getUsername = () => {
    return localStorage.getItem('businessCardOcrUserName') || 'Guest';
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
  };

  const setImageFile = (file) => {
    setImage(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const startCamera = async () => {
    try {
      // First try with back camera (environment)
      let constraints = {
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (envError) {
        console.warn('Back camera not available, trying front camera:', envError);
        // Fallback to front camera
        constraints.video.facingMode = 'user';
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (userError) {
          console.warn('Front camera failed, trying any camera:', userError);
          // Fallback to any available camera
          constraints.video = { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          };
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        }
      }
      
      setStream(mediaStream);
      setShowCamera(true);
      
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Error accessing camera. Please make sure you have granted camera permissions and your browser supports camera access.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions for high quality capture
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      
      // Draw video frame to canvas with better quality
      context.drawImage(video, 0, 0, width, height);
      
      // Convert canvas to blob with higher quality
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
          console.log('Captured image size:', blob.size, 'bytes');
          setImageFile(file);
          stopCamera();
        } else {
          alert('Failed to capture image. Please try again.');
        }
      }, 'image/jpeg', 0.95); // Higher quality (0.95 instead of 0.8)
    } else {
      alert('Camera not ready. Please try again.');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!image) return;

    const username = getUsername();
    
    setLoading(true);
    const formData = new FormData();
    formData.append("image", image);
    formData.append("username", username);

    try {
      const res = await axios.post("/api/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (res.data && res.data.success) {
        // Always pass the data, even if parsing failed
        const rawText = res.data.text || '';
        const parsedData = res.data.parsed_data || null;
        const responseUsername = res.data.username || getUsername();
        const responseDate = res.data.date || new Date().toLocaleDateString();
        
        onOcrResult(rawText, parsedData, responseUsername, responseDate);
        setImage(null);
        setPreview(null);
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
      } else {
        throw new Error(res.data?.error || 'No text extracted from image');
      }
    } catch (err) {
      console.error('Upload error:', err);
      let errorMessage = "Error uploading image or extracting text.";
      
      if (err.response) {
        // Server responded with error
        const serverError = err.response.data?.error || err.response.statusText;
        errorMessage = `Server error: ${serverError}`;
      } else if (err.request) {
        // Network error
        errorMessage = "Network error. Make sure the Flask server is running on port 5000.";
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Set video source when stream is available
  useEffect(() => {
    if (stream && videoRef.current && showCamera) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream, showCamera]);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl shadow-2xl border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-gray-800 to-black bg-clip-text text-transparent">
        Capture Business Card
      </h2>
      
      {/* Camera/Upload Toggle Buttons */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={startCamera}
          disabled={loading || showCamera}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
            showCamera
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
              : 'bg-gradient-to-r from-gray-800 to-black text-white hover:from-gray-700 hover:to-gray-900 shadow-lg'
          }`}
        >
          📷 {showCamera ? 'Camera Active' : 'Use Camera'}
        </button>
        <button
          onClick={() => document.getElementById('file-input').click()}
          disabled={loading || showCamera}
          className="flex-1 py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-500 hover:to-gray-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          📁 Upload File
        </button>
      </div>

      {/* Camera View */}
      {showCamera && (
        <div className="mb-6">
          <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden shadow-inner border border-gray-300">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
              onLoadedMetadata={() => {
                console.log('Video metadata loaded');
                if (videoRef.current) {
                  videoRef.current.play().catch(console.error);
                }
              }}
              onPlaying={() => console.log('Video is playing')}
              onError={(e) => console.error('Video error:', e)}
            />
            <div className="absolute inset-0 border-2 border-dashed border-white opacity-30 m-4 rounded-lg"></div>
          </div>
          <div className="flex space-x-4 mt-4">
            <button
              onClick={captureImage}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-500 hover:to-green-600 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
            >
              📸 Capture
            </button>
            <button
              onClick={stopCamera}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-500 hover:to-red-600 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hidden Canvas for Image Capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      
      {/* Hidden File Input */}
      <input
        id="file-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={loading}
      />

      {/* Preview and Upload Form */}
      {preview && (
        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              Preview
            </label>
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-contain border-2 border-gray-300 rounded-xl bg-gradient-to-br from-gray-50 to-white shadow-inner"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl pointer-events-none"></div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => {
                setImage(null);
                setPreview(null);
                const fileInput = document.getElementById('file-input');
                if (fileInput) fileInput.value = '';
              }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-400 hover:to-gray-500 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={!image || loading}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg ${
                !image || loading
                  ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-gray-800 to-black text-white hover:from-gray-700 hover:to-gray-900'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing with AI...
                </span>
              ) : (
                'Extract Text with AI'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default UploadForm;
