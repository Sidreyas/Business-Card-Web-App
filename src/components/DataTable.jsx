import React from "react";

function DataTable({ entries, onExportPDF }) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center text-gray-500 py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">📇</span>
          </div>
          <p className="font-medium text-gray-700">No business cards yet</p>
          <p className="text-sm mt-1">Upload a card to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card View */}
      <div className="block">
        {entries.slice().reverse().map((entry, index) => (
          <div 
            key={entry.id} 
            className={`
              bg-white rounded-lg shadow-sm border mb-4 overflow-hidden
              ${index === 0 ? 'ring-2 ring-green-200 bg-green-50' : ''}
              ${index > 0 && index < 3 ? 'ring-1 ring-blue-200 bg-blue-50' : ''}
            `}
          >
            {/* Card Header */}
            <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
              <div className="flex items-center space-x-2">
                {index === 0 && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    LATEST
                  </span>
                )}
                {index > 0 && index < 3 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    NEW
                  </span>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(entry.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              {entry.user_name && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-full">
                    👤 {entry.user_name}
                  </span>
                </div>
              )}
            </div>

            {/* Card Content */}
            <div className="p-4">
              <div className="space-y-3">
                {entry.name && (
                  <div className="flex items-start">
                    <span className="text-blue-600 font-medium text-sm w-20 flex-shrink-0">Name:</span> 
                    <span className="text-gray-900 font-medium text-sm">{entry.name}</span>
                  </div>
                )}
                {entry.title && (
                  <div className="flex items-start">
                    <span className="text-green-600 font-medium text-sm w-20 flex-shrink-0">Title:</span> 
                    <span className="text-gray-800 text-sm">{entry.title}</span>
                  </div>
                )}
                {entry.company && (
                  <div className="flex items-start">
                    <span className="text-purple-600 font-medium text-sm w-20 flex-shrink-0">Company:</span> 
                    <span className="text-gray-800 text-sm">{entry.company}</span>
                  </div>
                )}
                {entry.email && (
                  <div className="flex items-start">
                    <span className="text-red-600 font-medium text-sm w-20 flex-shrink-0">Email:</span>
                    <a href={`mailto:${entry.email}`} className="text-blue-600 hover:text-blue-800 text-sm hover:underline">
                      {entry.email}
                    </a>
                  </div>
                )}
                {entry.phone && (
                  <div className="flex items-start">
                    <span className="text-orange-600 font-medium text-sm w-20 flex-shrink-0">Phone:</span> 
                    <a href={`tel:${entry.phone}`} className="text-blue-600 hover:text-blue-800 text-sm hover:underline">
                      {entry.phone}
                    </a>
                  </div>
                )}
                {entry.website && (
                  <div className="flex items-start">
                    <span className="text-indigo-600 font-medium text-sm w-20 flex-shrink-0">Website:</span> 
                    <a href={entry.website.startsWith('http') ? entry.website : `https://${entry.website}`} 
                       target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm hover:underline">
                      {entry.website}
                    </a>
                  </div>
                )}
                {entry.address && (
                  <div className="flex items-start">
                    <span className="text-gray-600 font-medium text-sm w-20 flex-shrink-0">Address:</span> 
                    <span className="text-gray-800 text-sm">{entry.address}</span>
                  </div>
                )}
                
                {/* Comment Section */}
                {(entry.user_comment || entry.comment) && (
                  <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                    <div className="text-xs text-yellow-600 font-medium mb-1">Comment</div>
                    <div className="text-sm text-gray-800">{entry.user_comment || entry.comment}</div>
                  </div>
                )}

                {/* Raw OCR Text (Collapsible) */}
                {entry.ocr_text && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 font-medium">
                      View Raw OCR Text
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-700 whitespace-pre-wrap">
                      {entry.ocr_text}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DataTable;
