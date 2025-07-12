import React, { useState } from "react";

function UsernameDialog({ isOpen, onClose, onSave, currentUsername }) {
  const [newUsername, setNewUsername] = useState(currentUsername || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!newUsername.trim()) {
      setError('Username cannot be empty');
      return;
    }

    if (newUsername.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (newUsername.trim().length > 50) {
      setError('Username must be less than 50 characters');
      return;
    }

    // Check for valid characters (alphanumeric, underscore, hyphen)
    const validUsername = /^[a-zA-Z0-9_-]+$/.test(newUsername.trim());
    if (!validUsername) {
      setError('Username can only contain letters, numbers, underscore, and hyphen');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if username exists
      let checkData;
      try {
        const checkResponse = await fetch(`/api/check-username?username=${encodeURIComponent(newUsername.trim())}`);
        
        if (!checkResponse.ok) {
          // If API fails, try to proceed with username creation
          console.warn('Username check API failed, proceeding with creation attempt');
          checkData = { exists: false };
        } else {
          checkData = await checkResponse.json();
        }
      } catch (apiError) {
        console.warn('Username check API error:', apiError);
        // If API completely fails, assume username doesn't exist and try to create
        checkData = { exists: false };
      }

      if (checkData.exists && newUsername.trim() !== currentUsername) {
        setError('Username is already taken. Please try a different one.');
        setLoading(false);
        return;
      }

      // Save the username
      try {
        await onSave(newUsername.trim());
        handleClose();
      } catch (saveError) {
        console.error('Username save error:', saveError);
        
        // Check if error is because username already exists
        if (saveError.message && saveError.message.toLowerCase().includes('already exists')) {
          setError('Username is already taken. Please try a different one.');
        } else if (saveError.message && saveError.message.toLowerCase().includes('unique constraint')) {
          setError('Username is already taken. Please try a different one.');
        } else {
          setError(saveError.message || 'Failed to save username. Please check your connection and try again.');
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Don't allow closing if no username is set (first-time users)
    if (!currentUsername || currentUsername === 'Guest') {
      setError('Please set a username to continue using the app');
      return;
    }
    
    setNewUsername(currentUsername || '');
    setError('');
    setLoading(false);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSave();
    }
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentUsername ? 'Change Username' : 'Create Your Username'}
          </h3>
          <div className="mt-2">
            {!currentUsername ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start">
                  <span className="text-amber-500 mr-2 text-lg">⚠️</span>
                  <div>
                    <p className="text-amber-800 font-medium text-sm">Choose carefully!</p>
                    <p className="text-amber-700 text-xs mt-1">
                      Username cannot be changed once set. Make it professional and memorable.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Enter a unique username to identify your cards</p>
            )}
          </div>
        </div>
        
        <div className="px-6 py-4">
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your username"
              disabled={loading}
              autoFocus
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                <span className="text-red-700 text-sm font-medium">{error}</span>
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500 mb-4">
            <ul className="space-y-1">
              <li>• Must be 3-50 characters long</li>
              <li>• Can only contain letters, numbers, underscore (_), and hyphen (-)</li>
              <li>• Must be unique across all users</li>
            </ul>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
          {currentUsername && currentUsername !== 'Guest' && (
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading || !newUsername.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? 'Setting...' : (!currentUsername || currentUsername === 'Guest' ? 'Set Username' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UsernameDialog;
