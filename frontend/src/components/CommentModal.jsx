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
    <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-gray-900/80 to-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 rounded-t-2xl">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-black bg-clip-text text-transparent">
            Business Card Information Extracted
          </h3>
          <p className="text-sm text-gray-600 mt-2 font-medium">
            Review the AI-extracted information and add any comments
          </p>
          {userName && (
            <div className="mt-3 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              Generated on {new Date().toLocaleDateString()} by {userName}
            </div>
          )}
        </div>

        <div className="px-6 py-5">
          {/* Structured Data Preview */}
          <div className="mb-6">
            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              Extracted Information:
            </h4>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl space-y-3 border border-gray-200">
              {parsedData?.name && (
                <div className="flex items-center">
                  <span className="font-bold text-blue-700 w-24 flex items-center">Name:</span>
                  <span className="text-gray-800 font-medium">{parsedData.name}</span>
                </div>
              )}
              {parsedData?.title && (
                <div className="flex items-center">
                  <span className="font-bold text-green-700 w-24 flex items-center">Title:</span>
                  <span className="text-gray-800 font-medium">{parsedData.title}</span>
                </div>
              )}
              {parsedData?.company && (
                <div className="flex items-center">
                  <span className="font-bold text-purple-700 w-24 flex items-center">Company:</span>
                  <span className="text-gray-800 font-medium">{parsedData.company}</span>
                </div>
              )}
              {parsedData?.email && (
                <div className="flex items-center">
                  <span className="font-bold text-red-700 w-24 flex items-center">Email:</span>
                  <span className="text-blue-600 font-medium">{parsedData.email}</span>
                </div>
              )}
              {parsedData?.phone && (
                <div className="flex items-center">
                  <span className="font-bold text-orange-700 w-24 flex items-center">Phone:</span>
                  <span className="text-blue-600 font-medium">{parsedData.phone}</span>
                </div>
              )}
              {parsedData?.website && (
                <div className="flex items-center">
                  <span className="font-bold text-indigo-700 w-24 flex items-center">Website:</span>
                  <span className="text-blue-600 font-medium">{parsedData.website}</span>
                </div>
              )}
              {parsedData?.address && (
                <div className="flex items-start">
                  <span className="font-bold text-gray-700 w-24 flex items-center">Address:</span>
                  <span className="text-gray-800 font-medium">{parsedData.address}</span>
                </div>
              )}

              {/* Show if no structured data found */}
              {(!parsedData?.name &&
                !parsedData?.company &&
                !parsedData?.email &&
                !parsedData?.phone) && (
                <div className="bg-gradient-to-r from-orange-100 to-yellow-100 border-l-4 border-orange-400 p-3 rounded-lg">
                  <span className="text-orange-700 font-medium">Limited structured data found. Raw text available in table.</span>
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
