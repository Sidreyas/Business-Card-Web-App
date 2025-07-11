import React, { useState, useEffect } from "react";

function CommentModal({ show, onClose, onSave, parsedData, userName }) {
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (show) {
      setComment("");
    }
  }, [show]);

  if (!show) return null;

  const handleSave = () => {
    onSave(comment);
    setComment("");
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
      <div className="premium-card glow-box max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/20">
        <div className="px-6 py-5 glass-effect border-b border-white/10 rounded-t-xl">
          <h3 className="text-2xl font-bold text-gradient-premium">
            Business Card Extracted
          </h3>
          <p className="text-sm text-gradient-accent mt-2 font-medium">
            AI-powered OCR has processed your business card
          </p>
          {userName && (
            <div className="mt-3 text-xs btn-premium-dark px-3 py-2 rounded-xl inline-flex items-center space-x-2">
              <span>📅</span>
              <span>Generated on {new Date().toLocaleDateString()} by {userName}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-5">
          {/* Premium Structured Data Preview */}
          <div className="mb-6">
            <h4 className="text-lg font-bold text-gradient-premium mb-4 flex items-center">
              ✨ Extracted Contact Information
            </h4>
            <div className="premium-card glow-box p-5 rounded-xl space-y-4 border border-white/10">
              {parsedData?.name && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">👤</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs font-bold">NAME</span>
                    <div className="text-white font-bold">{parsedData.name}</div>
                  </div>
                </div>
              )}
              {parsedData?.title && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">💼</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs font-bold">TITLE</span>
                    <div className="text-white font-medium">{parsedData.title}</div>
                  </div>
                </div>
              )}
              {parsedData?.company && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">🏢</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs font-bold">COMPANY</span>
                    <div className="text-white font-medium">{parsedData.company}</div>
                  </div>
                </div>
              )}
              {parsedData?.email && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">📧</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs font-bold">EMAIL</span>
                    <div className="text-white font-medium">{parsedData.email}</div>
                  </div>
                </div>
              )}
              {parsedData?.phone && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">📞</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs font-bold">PHONE</span>
                    <div className="text-white font-medium">{parsedData.phone}</div>
                  </div>
                </div>
              )}
              {parsedData?.website && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">🌐</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs font-bold">WEBSITE</span>
                    <div className="text-white font-medium">{parsedData.website}</div>
                  </div>
                </div>
              )}
              {parsedData?.address && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">📍</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs font-bold">ADDRESS</span>
                    <div className="text-white font-medium">{parsedData.address}</div>
                  </div>
                </div>
              )}

              {/* Show if no structured data found */}
              {(!parsedData?.name &&
                !parsedData?.company &&
                !parsedData?.email &&
                !parsedData?.phone) && (
                <div className="premium-card border border-orange-400/30 p-4 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">⚠️</span>
                    </div>
                    <div>
                      <span className="text-white font-bold">Limited data extracted</span>
                      <div className="text-gray-300 text-sm">Raw OCR text is available below</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Raw OCR Text */}
          <details className="mb-6">
            <summary className="cursor-pointer text-md font-bold text-gray-700 hover:text-gray-900 flex items-center">
              View Raw OCR Text
            </summary>
            <div className="mt-3 p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto border-l-4 border-gray-400">
              {parsedData?.rawText || "No raw text available"}
            </div>
          </details>

          {/* Comment Input */}
          <div>
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Add your comment (optional):
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any notes about this business card..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Save Entry
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommentModal;
