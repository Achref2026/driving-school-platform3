import React, { useState, useRef } from 'react';

const DocumentUpload = ({ 
  documentType, 
  onUploadSuccess, 
  onCancel, 
  existingDocuments = [], 
  requiredDocuments = [],
  isOpen = false 
}) => {
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [dragOver, setDragOver] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [previewUrls, setPreviewUrls] = useState({});
  const fileInputRefs = useRef({});

  // Document type configurations (removed driving_license and teaching_license)
  const documentConfigs = {
    profile_photo: {
      label: 'Profile Photo',
      icon: '👤',
      accept: '.jpg,.jpeg,.png',
      description: 'Upload a clear photo of yourself',
      color: 'bg-blue-500'
    },
    id_card: {
      label: 'ID Card',
      icon: '🆔',
      accept: '.pdf,.jpg,.jpeg,.png',
      description: 'Upload your national ID card (both sides)',
      color: 'bg-green-500'
    },
    medical_certificate: {
      label: 'Medical Certificate',
      icon: '🏥',
      accept: '.pdf,.jpg,.jpeg,.png',
      description: 'Medical certificate for vision and fitness',
      color: 'bg-red-500'
    },
    residence_certificate: {
      label: 'Residence Certificate',
      icon: '🏠',
      accept: '.pdf,.jpg,.jpeg,.png',
      description: 'Proof of residence document',
      color: 'bg-purple-500'
    }
  };

  const getDocumentConfig = (type) => {
    return documentConfigs[type] || {
      label: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: '📄',
      accept: '.pdf,.jpg,.jpeg,.png',
      description: 'Upload required document',
      color: 'bg-gray-500'
    };
  };

  const handleFileSelect = (docType, file) => {
    if (file) {
      setSelectedFiles(prev => ({ ...prev, [docType]: file }));
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrls(prev => ({ ...prev, [docType]: e.target.result }));
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrls(prev => ({ ...prev, [docType]: null }));
      }
    }
  };

  const handleDrop = (e, docType) => {
    e.preventDefault();
    setDragOver(null);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(docType, files[0]);
    }
  };

  const handleUpload = async (docType) => {
    const file = selectedFiles[docType];
    if (!file) return;

    setUploading(prev => ({ ...prev, [docType]: true }));
    setUploadProgress(prev => ({ ...prev, [docType]: 0 }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);

      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(prev => ({ ...prev, [docType]: percentComplete }));
        }
      });

      const response = await new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr);
        xhr.onerror = () => reject(new Error('Upload failed'));
        
        xhr.open('POST', `${process.env.REACT_APP_BACKEND_URL}/api/documents/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      if (response.status === 200) {
        const data = JSON.parse(response.responseText);
        
        // Clear the file selection for this document type
        setSelectedFiles(prev => ({ ...prev, [docType]: null }));
        setPreviewUrls(prev => ({ ...prev, [docType]: null }));
        setUploadProgress(prev => ({ ...prev, [docType]: 100 }));
        
        if (onUploadSuccess) {
          onUploadSuccess(data, docType);
        }
        
        // Show success message
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
        }, 2000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed for ${getDocumentConfig(docType).label}. Please try again.`);
      setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }));
    }
  };

  const isDocumentUploaded = (docType) => {
    return existingDocuments.some(doc => doc.document_type === docType);
  };

  const getUploadedDocument = (docType) => {
    return existingDocuments.find(doc => doc.document_type === docType);
  };

  const documentsToShow = requiredDocuments.length > 0 ? requiredDocuments : 
    (documentType ? [documentType] : Object.keys(documentConfigs));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Document Upload</h3>
              <p className="text-gray-600">Upload required documents for verification</p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documentsToShow.map((docType) => {
              const config = getDocumentConfig(docType);
              const uploaded = isDocumentUploaded(docType);
              const uploadedDoc = getUploadedDocument(docType);
              const file = selectedFiles[docType];
              const isUploading = uploading[docType];
              const progress = uploadProgress[docType] || 0;
              const preview = previewUrls[docType];

              return (
                <div key={docType} className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center mb-3">
                    <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center text-white text-xl mr-3`}>
                      {config.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{config.label}</h4>
                      <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                    {uploaded && (
                      <div className="text-green-500">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {uploaded && !file ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-800 font-medium">✓ Document Uploaded</p>
                          <p className="text-green-600 text-sm">
                            Status: Uploaded - Ready for Review
                          </p>
                        </div>
                        {uploadedDoc?.file_url && (
                          <a
                            href={uploadedDoc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Upload Area */}
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 cursor-pointer ${
                          dragOver === docType
                            ? 'border-blue-500 bg-blue-50'
                            : file
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onDrop={(e) => handleDrop(e, docType)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={() => setDragOver(docType)}
                        onDragLeave={() => setDragOver(null)}
                        onClick={() => fileInputRefs.current[docType]?.click()}
                      >
                        <input
                          type="file"
                          accept={config.accept}
                          onChange={(e) => handleFileSelect(docType, e.target.files[0])}
                          className="hidden"
                          ref={(el) => fileInputRefs.current[docType] = el}
                        />

                        {file ? (
                          <div className="space-y-3">
                            {preview && (
                              <img
                                src={preview}
                                alt="Preview"
                                className="w-24 h-24 object-cover rounded-lg mx-auto"
                              />
                            )}
                            <div>
                              <p className="font-medium text-gray-800">{file.name}</p>
                              <p className="text-sm text-gray-600">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="text-4xl">{config.icon}</div>
                            <div>
                              <p className="text-gray-600 mb-2">
                                {dragOver === docType ? 'Drop file here' : 'Drag & drop or click to select'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Accepted: {config.accept.replace(/\./g, '').toUpperCase()} (Max 5MB)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Upload Progress */}
                      {isUploading && (
                        <div className="mt-3">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Uploading...</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Upload Button */}
                      {file && !isUploading && (
                        <button
                          onClick={() => handleUpload(docType)}
                          className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Upload {config.label}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {existingDocuments.length} of {documentsToShow.length} documents uploaded
              </div>
              <button
                onClick={onCancel}
                className="bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;