import React, { useState, useEffect } from 'react';

const VideoCall = ({ roomUrl, onLeave }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const handleJoinCall = () => {
    if (roomUrl) {
      // Open video call in new window
      window.open(roomUrl, '_blank', 'width=800,height=600');
      setIsInCall(true);
    }
  };

  const handleLeaveCall = () => {
    setIsInCall(false);
    if (onLeave) {
      onLeave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Video Call Session</h3>
          
          {!isInCall ? (
            <div className="text-center">
              <div className="text-6xl mb-4">📹</div>
              <p className="text-gray-600 mb-6">Ready to join the video call session?</p>
              <div className="flex space-x-4">
                <button
                  onClick={handleJoinCall}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium"
                >
                  Join Call
                </button>
                <button
                  onClick={onLeave}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-gray-600 mb-6">Call opened in new window</p>
              <button
                onClick={handleLeaveCall}
                className="bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 font-medium"
              >
                End Call
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;