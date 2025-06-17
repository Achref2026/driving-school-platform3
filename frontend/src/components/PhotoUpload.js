import React, { useState } from 'react';

const PhotoUpload = ({ onUploadSuccess, onCancel }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handlePhotoSelect = (file) => {
    setSelectedPhoto(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedPhoto) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', selectedPhoto);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/photos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        onUploadSuccess(data);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upload Photo</h3>
          
          <div className="text-center mb-6">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full mx-auto bg-gray-100 border-4 border-gray-200 flex items-center justify-center">
                <span className="text-4xl">📸</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoSelect(e.target.files[0])}
              className="hidden"
              id="photo-input"
            />
            <label
              htmlFor="photo-input"
              className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-lg cursor-pointer hover:bg-blue-700"
            >
              Choose Photo
            </label>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleUpload}
              disabled={!selectedPhoto || uploading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;