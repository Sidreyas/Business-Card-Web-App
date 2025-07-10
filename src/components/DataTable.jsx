import React from "react";

function DataTable({ entries, onExportPDF }) {
  if (entries.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-2xl p-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-gray-800 to-black bg-clip-text text-transparent">
          Extracted Entries
        </h2>
        <div className="text-center text-gray-500 py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
            <span className="text-2xl">📇</span>
          </div>
          <p className="text-lg font-medium">No business cards processed yet.</p>
          <p className="text-sm mt-2">Upload a business card to see extracted information here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-2xl border border-gray-200">
      <div className="px-6 py-4 bg-gradient-to-r from-gray-100 to-white border-b border-gray-200 flex justify-between items-center rounded-t-xl">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-black bg-clip-text text-transparent">
          Extracted Entries ({entries.length})
        </h2>
        <button
          onClick={onExportPDF}
          className="bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Export PDF
        </button>
      </div>
      
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Contact Information
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Comment
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.slice().reverse().map((entry, index) => (
              <tr 
                key={entry.id} 
                className={`
                  ${index === 0 ? 'bg-gradient-to-r from-green-50 to-green-100' : 
                    index < 3 ? 'bg-gradient-to-r from-blue-50 to-blue-100' : 
                    'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'}
                  transition-colors
                `}
              >
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <div className="flex flex-col">
                    {index === 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-400 to-green-600 text-white mb-2 w-fit shadow-lg">
                        LATEST
                      </span>
                    )}
                    {index > 0 && index < 3 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-400 to-blue-600 text-white mb-2 w-fit shadow-lg">
                        NEW
                      </span>
                    )}
                    <div className="text-gray-900 font-bold">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-gray-600 text-xs font-medium">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div className="space-y-2">
                    {entry.parsedData?.name && (
                      <div className="flex items-center">
                        <span className="font-bold text-blue-700 mr-2">Name:</span> 
                        <span className="text-gray-800 font-medium">{entry.parsedData.name}</span>
                      </div>
                    )}
                    {entry.parsedData?.title && (
                      <div className="flex items-center">
                        <span className="font-bold text-green-700 mr-2">Title:</span> 
                        <span className="text-gray-800 font-medium">{entry.parsedData.title}</span>
                      </div>
                    )}
                    {entry.parsedData?.company && (
                      <div className="flex items-center">
                        <span className="font-bold text-purple-700 mr-2">Company:</span> 
                        <span className="text-gray-800 font-medium">{entry.parsedData.company}</span>
                      </div>
                    )}
                    {entry.parsedData?.email && (
                      <div className="flex items-center">
                        <span className="font-bold text-red-700 mr-2">Email:</span>
                        <a href={`mailto:${entry.parsedData.email}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
                          {entry.parsedData.email}
                        </a>
                      </div>
                    )}
                    {entry.parsedData?.phone && (
                      <div className="flex items-center">
                        <span className="font-bold text-orange-700 mr-2">Phone:</span> 
                        <a href={`tel:${entry.parsedData.phone}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
                          {entry.parsedData.phone}
                        </a>
                      </div>
                    )}
                    {entry.parsedData?.website && (
                      <div className="flex items-center">
                        <span className="font-bold text-indigo-700 mr-2">Website:</span> 
                        <a href={entry.parsedData.website.startsWith('http') ? entry.parsedData.website : `https://${entry.parsedData.website}`} 
                           target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
                          {entry.parsedData.website}
                        </a>
                      </div>
                    )}
                    {entry.parsedData?.address && (
                      <div className="flex items-start">
                        <span className="font-bold text-gray-700 mr-2">Address:</span> 
                        <span className="text-gray-800 font-medium">{entry.parsedData.address}</span>
                      </div>
                    )}
                    
                    {/* Show raw text in a collapsible section */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center">
                        View Raw OCR Text
                      </summary>
                      <div className="mt-2 p-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg text-xs text-gray-700 whitespace-pre-wrap border-l-4 border-gray-400">
                        {entry.ocrText}
                      </div>
                    </details>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div className="max-w-xs">
                    {entry.comment ? (
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 p-3 rounded-lg">
                        <span className="text-gray-800 font-medium">{entry.comment}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">No comment</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
