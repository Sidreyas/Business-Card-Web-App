import React, { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import DataTable from './components/DataTable';
import CommentModal from './components/CommentModal';
import UsernameDialog from './components/UsernameDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Business Card Parser Function
const parseBusinessCard = (ocrText) => {
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const parsed = {
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    rawText: ocrText
  };

  // Email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // Enhanced phone regex (various formats)
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})|(\+\d{1,3}[-.\s]?)?\d{8,15}/g;
  
  // Enhanced website regex
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?/g;
  
  // Enhanced common title keywords
  const titleKeywords = [
    'CEO', 'CTO', 'CFO', 'COO', 'President', 'Director', 'Manager', 'Senior', 'Lead', 
    'Engineer', 'Developer', 'Designer', 'Analyst', 'Consultant', 'Specialist', 
    'Executive', 'Vice President', 'VP', 'Assistant', 'Coordinator', 'Supervisor',
    'Partner', 'Founder', 'Owner', 'Principal', 'Chief', 'Head', 'Administrator'
  ];
  
  // Enhanced common company indicators
  const companyIndicators = [
    'Inc', 'Corp', 'Corporation', 'LLC', 'Ltd', 'Limited', 'Company', 'Co.',
    'Solutions', 'Services', 'Systems', 'Technologies', 'Tech', 'Group', 'Associates',
    'Partners', 'Consulting', 'Holdings', 'Enterprises', 'International', 'Global'
  ];

  lines.forEach((line, index) => {
    // Extract email
    const emailMatch = line.match(emailRegex);
    if (emailMatch && !parsed.email) {
      parsed.email = emailMatch[0];
      return;
    }

    // Extract phone
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !parsed.phone) {
      parsed.phone = phoneMatch[0];
      return;
    }

    // Extract website
    const websiteMatch = line.match(websiteRegex);
    if (websiteMatch && !parsed.website && !line.includes('@')) {
      let website = websiteMatch[0];
      if (!website.startsWith('http') && !website.startsWith('www.')) {
        website = 'www.' + website;
      }
      parsed.website = website;
      return;
    }

    // Check if line contains title keywords
    const hasTitle = titleKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasTitle && !parsed.title) {
      parsed.title = line;
      return;
    }

    // Check if line contains company indicators
    const hasCompanyIndicator = companyIndicators.some(indicator => 
      line.toLowerCase().includes(indicator.toLowerCase())
    );
    if (hasCompanyIndicator && !parsed.company) {
      parsed.company = line;
      return;
    }

    // Heuristic for name (usually first meaningful line, not too long, has spaces)
    if (!parsed.name && line.length > 3 && line.length < 50 && 
        line.includes(' ') && index < 3 && 
        !line.includes('@') && !phoneMatch && !websiteMatch) {
      parsed.name = line;
      return;
    }

    // Heuristic for company (if not found by indicators, look for capitalized words)
    if (!parsed.company && line.length > 3 && 
        line === line.toUpperCase() && !line.includes('@') && !phoneMatch) {
      parsed.company = line;
      return;
    }
  });

  // If no company found by indicators, try to find it by position (often after name/title)
  if (!parsed.company) {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      if (line !== parsed.name && line !== parsed.title && 
          !line.includes('@') && !line.match(phoneRegex) && 
          !line.match(websiteRegex) && line.length > 3) {
        parsed.company = line;
        break;
      }
    }
  }

  // Enhanced address extraction
  const addressKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'suite', 'floor', 'building', 'blvd', 'drive', 'dr', 'lane', 'ln', 'way'];
  let addressLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Look for address patterns
    if ((
      /\b\d+\s+[A-Za-z0-9\s,]+/.test(line) || // Street number pattern
      addressKeywords.some(keyword => lowerLine.includes(keyword)) ||
      /[A-Z][a-z]+,\s*[A-Z]{2}\s+\d{5}/.test(line) // City, State ZIP pattern
    ) && !lowerLine.includes('@') && !phoneRegex.test(line)) {
      addressLines.push(line.trim());
      
      // Check next line for city/state/zip
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (/[A-Z][a-z]+,\s*[A-Z]{2}\s+\d{5}/.test(nextLine)) {
          addressLines.push(nextLine.trim());
        }
      }
    }
  }
  
  if (addressLines.length > 0) {
    parsed.address = addressLines.join(', ');
  } else {
    // If no address found by keywords, use remaining lines
    const remainingLines = lines.filter(line => 
      line !== parsed.name && 
      line !== parsed.title && 
      line !== parsed.company && 
      line !== parsed.email && 
      line !== parsed.phone && 
      line !== parsed.website &&
      line.length > 5
    );
    
    if (remainingLines.length > 0) {
      parsed.address = remainingLines.join(', ');
    }
  }

  return parsed;
};

function App() {
  const [entries, setEntries] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentOcrText, setCurrentOcrText] = useState('');
  const [currentParsedData, setCurrentParsedData] = useState(null);
  const [userName, setUserName] = useState('');
  const [currentProcessingDate, setCurrentProcessingDate] = useState('');
  const [notification, setNotification] = useState('');
  const [activePage, setActivePage] = useState('capture'); // 'capture' or 'entries'
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);

  // Load entries from API on component mount
  useEffect(() => {
    const loadEntriesFromAPI = async () => {
      try {
        const response = await fetch('/api/entries?limit=100');
        if (response.ok) {
          const data = await response.json();
          const apiEntries = data.entries || [];
          setEntries(apiEntries);
          if (apiEntries.length > 0) {
            setNotification(`Loaded ${apiEntries.length} business card${apiEntries.length > 1 ? 's' : ''} from database.`);
            setTimeout(() => setNotification(''), 3000);
          }
        } else {
          // Fallback to localStorage if API fails
          const savedEntries = localStorage.getItem('businessCardOcrEntries');
          if (savedEntries) {
            const parsedEntries = JSON.parse(savedEntries);
            setEntries(parsedEntries);
            setNotification(`API unavailable. Loaded ${parsedEntries.length} saved entries from device.`);
            setTimeout(() => setNotification(''), 3000);
          }
        }
      } catch (error) {
        console.error('Error loading entries from API:', error);
        // Fallback to localStorage
        const savedEntries = localStorage.getItem('businessCardOcrEntries');
        if (savedEntries) {
          const parsedEntries = JSON.parse(savedEntries);
          setEntries(parsedEntries);
          setNotification(`API error. Loaded ${parsedEntries.length} entries from device.`);
          setTimeout(() => setNotification(''), 3000);
        }
      }
    };

    loadEntriesFromAPI();
  }, []);

  // Backup entries to localStorage (fallback only)
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem('businessCardOcrEntries', JSON.stringify(entries));
    }
  }, [entries]);

  // Load username from localStorage on component mount
  useEffect(() => {
    const savedUserName = localStorage.getItem('businessCardOcrUserName');
    if (savedUserName) {
      setUserName(savedUserName);
    } else {
      setUserName('Guest'); // Default to Guest
    }
  }, []);

  // Save username to localStorage when it changes
  useEffect(() => {
    if (userName && userName !== 'Guest') {
      localStorage.setItem('businessCardOcrUserName', userName);
    }
  }, [userName]);

  // Handle username save from dialog
  const handleUsernameSave = async (newUsername) => {
    try {
      // Create user in database
      const response = await fetch('/api/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: newUsername }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save username');
      }

      // Update local state
      setUserName(newUsername);
      localStorage.setItem('businessCardOcrUserName', newUsername);
      
      setNotification(`Username updated to "${newUsername}"`);
      setTimeout(() => setNotification(''), 3000);
      
    } catch (error) {
      console.error('Error saving username:', error);
      throw error; // Re-throw to let dialog handle the error display
    }
  };

  const handleOcrResult = (ocrText, parsedData, responseUsername, responseDate) => {
    setCurrentOcrText(ocrText);
    
    // Update userName if provided from the response
    if (responseUsername) {
      setUserName(responseUsername);
    }
    
    // Use AI-parsed data if available and valid, otherwise fall back to our parsing
    let finalParsedData = null;
    
    if (parsedData && parsedData.name && !parsedData.error && !parsedData.parsing_error) {
      // AI parsing was successful
      finalParsedData = parsedData;
    } else {
      // AI parsing failed or returned incomplete data, use fallback parsing
      console.log('AI parsing failed or incomplete, using fallback parser');
      finalParsedData = parseBusinessCard(ocrText);
    }
    
    setCurrentParsedData(finalParsedData);
    
    // Store the processing date
    setCurrentProcessingDate(responseDate || new Date().toLocaleDateString());
    
    setShowModal(true);
  };

  const handleSaveComment = (comment) => {
    const newEntry = {
      id: Date.now(),
      ocrText: currentOcrText,
      parsedData: currentParsedData,
      comment: comment,
      timestamp: new Date().toISOString(),
      generatedBy: userName,
      generatedOn: currentProcessingDate || new Date().toLocaleDateString()
    };
    setEntries([...entries, newEntry]);
    setShowModal(false);
    setCurrentOcrText('');
    setCurrentParsedData(null);
    setCurrentProcessingDate('');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Add title
    doc.setFontSize(20);
    doc.text('Business Card OCR Report', 20, 25);
    
    // Add generation metadata below title
    doc.setFontSize(12);
    doc.text(`Generated on ${currentProcessingDate || new Date().toLocaleDateString()} by ${userName}`, 20, 35);
    doc.text(`Total entries: ${entries.length}`, 20, 42);
    
    // Prepare structured table data (cleaned up)
    const tableData = entries.slice().reverse().map(entry => [
      new Date(entry.timestamp).toLocaleDateString() + '\n' + 
      new Date(entry.timestamp).toLocaleTimeString(),
      
      // Structured data display
      [
        entry.parsedData?.name ? `Name: ${entry.parsedData.name}` : '',
        entry.parsedData?.title ? `Title: ${entry.parsedData.title}` : '',
        entry.parsedData?.company ? `Company: ${entry.parsedData.company}` : '',
        entry.parsedData?.email ? `Email: ${entry.parsedData.email}` : '',
        entry.parsedData?.phone ? `Phone: ${entry.parsedData.phone}` : '',
        entry.parsedData?.website ? `Website: ${entry.parsedData.website}` : '',
        entry.parsedData?.address ? `Address: ${entry.parsedData.address}` : ''
      ].filter(field => field).join('\n'),
      
      entry.comment
    ]);
    
    // Add table with structured data
    autoTable(doc, {
      head: [['Date & Time', 'Structured Contact Information', 'Comment']],
      body: tableData,
      startY: 50,
      styles: {
        fontSize: 8,
        cellPadding: 4,
        valign: 'top',
        overflow: 'linebreak',
        lineColor: [44, 62, 80],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { 
          cellWidth: 35,
          halign: 'center' 
        },
        1: { 
          cellWidth: 160,
          halign: 'left'
        },
        2: { 
          cellWidth: 75,
          halign: 'left'
        }
      },
      margin: { top: 50, left: 15, right: 15 },
      theme: 'grid',
      tableWidth: 'auto'
    });
    
    // Save the PDF
    doc.save(`business-cards-${new Date().getTime()}.pdf`);
  };

  const handleClearData = () => {
    const confirmClear = window.confirm(
      'Are you sure you want to clear all saved business card data? This action cannot be undone.'
    );
    
    if (confirmClear) {
      setEntries([]);
      localStorage.removeItem('businessCardOcrEntries');
      setNotification('All data has been cleared successfully.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  // Function to refresh data from API
  const refreshDataFromAPI = async () => {
    try {
      const response = await fetch('/api/entries?limit=100');
      if (response.ok) {
        const data = await response.json();
        const apiEntries = data.entries || [];
        setEntries(apiEntries);
        setNotification(`Refreshed! Loaded ${apiEntries.length} business cards from database.`);
        setTimeout(() => setNotification(''), 3000);
        return true;
      }
    } catch (error) {
      console.error('Error refreshing from API:', error);
      setNotification('Failed to refresh from database. Showing cached data.');
      setTimeout(() => setNotification(''), 3000);
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-gray-800 to-black text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">
              {activePage === 'capture' ? '📸 Card Scanner' : '📋 My Cards'}
            </h1>
            <p className="text-sm text-gray-300">Welcome, {userName}!</p>
          </div>
          <button
            onClick={() => setShowUsernameDialog(true)}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg transition-colors"
          >
            Change User
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="bg-green-50 border-b border-green-200 p-3">
          <div className="flex items-center justify-center">
            <span className="text-green-600 mr-2">✓</span>
            <span className="text-green-800 text-sm">{notification}</span>
          </div>
        </div>
      )}

      {/* Main Content Area with padding for bottom nav */}
      <div className="pb-20">
        {activePage === 'capture' && (
          <CapturePageContent onOcrResult={handleOcrResult} />
        )}
        
        {activePage === 'entries' && (
          <EntriesPageContent 
            entries={entries} 
            onExportPDF={handleExportPDF} 
            onClearData={handleClearData}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex">
          <button
            onClick={() => setActivePage('capture')}
            className={`flex-1 flex flex-col items-center py-3 px-4 transition-colors ${
              activePage === 'capture' 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-xl mb-1">📸</span>
            <span className="text-xs font-medium">Capture</span>
          </button>
          
          <button
            onClick={() => setActivePage('entries')}
            className={`flex-1 flex flex-col items-center py-3 px-4 transition-colors ${
              activePage === 'entries' 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-xl mb-1">📋</span>
            <span className="text-xs font-medium">
              Cards ({entries.length})
            </span>
          </button>
        </div>
      </div>

      <CommentModal 
        show={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveComment}
        parsedData={currentParsedData}
        userName={userName}
      />
      
      <UsernameDialog
        isOpen={showUsernameDialog}
        onClose={() => setShowUsernameDialog(false)}
        onSave={handleUsernameSave}
        currentUsername={userName}
      />
    </div>
  );
}

// Capture Page Component
function CapturePageContent({ onOcrResult }) {
  return (
    <div className="p-4 space-y-6">
      {/* Hero Section */}
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-3xl">🃏</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Scan Business Cards
        </h2>
        <p className="text-gray-600 text-sm">
          Upload or capture a business card to extract contact information instantly
        </p>
      </div>

      {/* Upload Form */}
      <UploadForm onOcrResult={onOcrResult} />
      
      {/* Features */}
      <div className="grid grid-cols-2 gap-4 mt-8">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-center">
            <span className="text-2xl mb-2 block">⚡</span>
            <h3 className="font-semibold text-sm text-gray-800">Fast OCR</h3>
            <p className="text-xs text-gray-600 mt-1">Instant text extraction</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-center">
            <span className="text-2xl mb-2 block">☁️</span>
            <h3 className="font-semibold text-sm text-gray-800">Cloud Sync</h3>
            <p className="text-xs text-gray-600 mt-1">Access from any device</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Entries Page Component  
function EntriesPageContent({ entries, onExportPDF, onClearData }) {
  return (
    <div className="p-4">
      {/* Stats Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white mb-6">
        <h3 className="text-lg font-bold mb-2">Your Business Cards</h3>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-2xl font-bold">{entries.length}</p>
            <p className="text-sm opacity-90">Total Cards</p>
          </div>
          <div className="flex space-x-2">
            {entries.length > 0 && (
              <>
                <button
                  onClick={onExportPDF}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  📄 Export
                </button>
                <button
                  onClick={onClearData}
                  className="bg-red-500 bg-opacity-80 hover:bg-opacity-100 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  🗑️ Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable entries={entries} onExportPDF={onExportPDF} onClearData={onClearData} />
    </div>
  );
}

export default App;
