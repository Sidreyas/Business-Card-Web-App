import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "../config/api";

function UploadForm({ onOcrResult }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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
      let constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (envError) {
        constraints.video.facingMode = 'user';
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      
      setStream(mediaStream);
      setShowCamera(true);
      
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Error accessing camera. Please check permissions.');
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
      
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      
      context.drawImage(video, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
          setImageFile(file);
          stopCamera();
        } else {
          alert('Failed to capture image. Please try again.');
        }
      }, 'image/jpeg', 0.95);
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
      const res = await axios.post(getApiUrl("upload-db"), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for OCR processing
      });
      
      if (res.data && res.data.success) {
        const rawText = res.data.text || '';
        const parsedData = res.data.parsed_data || null;
        const responseUsername = res.data.user_name || getUsername();
        const responseDate = res.data.created_at ? new Date(res.data.created_at).toLocaleDateString() : new Date().toLocaleDateString();
        const entryId = res.data.id; // Get the database entry ID
        
        onOcrResult(rawText, parsedData, responseUsername, responseDate, entryId);
        setImage(null);
        setPreview(null);
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
      } else {
        throw new Error(res.data?.error || 'No text extracted from image');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading image or extracting text.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (stream && videoRef.current && showCamera) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream, showCamera]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gradient-premium mb-2">
          AI Card Scanner
        </h2>
        <p className="text-sm text-gradient-accent">
         Try capturing clear business card images for better results.
        </p>
      </div>
      
      <div className="px-4">
        <button
          onClick={startCamera}
          disabled={loading || showCamera}
          className="w-full btn-premium py-4 px-4 rounded-xl font-bold glow-box"
        >
          <div className="flex flex-col items-center space-y-1">
            <span className="text-lg">📷</span>
            <span className="text-xs">Use Camera</span>
          </div>
        </button>
      </div>

      {showCamera && (
        <div className="premium-card glow-box rounded-xl p-4 border border-white/20">
          <div className="relative bg-gradient-to-br from-black to-gray-900 rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 border-2 border-dashed border-white opacity-30 m-4 rounded-lg"></div>
          </div>
          <div className="flex space-x-4 mt-4">
            <button
              onClick={stopCamera}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
            >
              Cancel
            </button>
            <button
              onClick={captureImage}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-lg hover:from-gray-600 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
            >
              📸 Capture
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      
      <input
        id="file-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={loading}
      />

      {preview && (
        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-lg font-semibold text-gradient-premium mb-3">
              Preview
            </label>
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-contain border-2 border-white/20 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 shadow-inner"
              />
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
              className="flex-1 py-3 px-4 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={!image || loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-lg hover:from-gray-600 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium glow-box"
            >
              {loading ? 'Processing...' : '🚀 Extract Text with AI'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default UploadForm;
