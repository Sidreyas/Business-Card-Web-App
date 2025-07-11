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
      // Show username dialog for first-time users after a short delay
      setTimeout(() => setShowUsernameDialog(true), 1000);
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
    <div className="min-h-screen" style={{background: 'var(--gradient-primary)'}}>
      {/* Premium Mobile Header */}
      <div className="glass-effect border-b border-white/10 p-4 sticky top-0 z-30">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 premium-card rounded-xl flex items-center justify-center glow-box">
              <span className="text-xl">{activePage === 'capture' ? '📸' : '📋'}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gradient-premium">
                {activePage === 'capture' ? 'Card Scanner Pro' : 'My Card Vault'}
              </h1>
              {userName && userName !== 'Guest' ? (
                <p className="text-xs text-gradient-accent">Professional OCR Technology</p>
              ) : (
                <p className="text-xs text-yellow-300">⚠️ Please set your username first</p>
              )}
            </div>
          </div>
          {(!userName || userName === 'Guest') && (
            <button
              onClick={() => setShowUsernameDialog(true)}
              className="btn-premium px-4 py-2 rounded-xl text-xs font-medium glow-box"
            >
              Set Username
            </button>
          )}
        </div>
      </div>

      {/* Premium Notification */}
      {notification && (
        <div className="glass-effect border-b border-white/10 p-3 glow-box">
          <div className="flex items-center justify-center">
            <span className="text-white mr-2">✓</span>
            <span className="text-gradient-premium text-sm font-medium">{notification}</span>
          </div>
        </div>
      )}

      {/* Main Content Area with padding for bottom nav */}
      <div className="pb-20">
        {activePage === 'capture' && (
          <CapturePageContent onOcrResult={handleOcrResult} userName={userName} />
        )}
        
        {activePage === 'entries' && (
          <EntriesPageContent 
            entries={entries} 
            onExportPDF={handleExportPDF}
          />
        )}
      </div>

      {/* Premium Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 glass-effect border-t border-white/10 z-40">
        <div className="flex">
          <button
            onClick={() => setActivePage('capture')}
            className={`flex-1 flex flex-col items-center py-4 px-4 transition-all duration-300 ${
              activePage === 'capture' 
                ? 'text-white bg-white/10 glow-box' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-xl mb-1">📸</span>
            <span className="text-xs font-medium">Capture</span>
          </button>
          
          <button
            onClick={() => setActivePage('entries')}
            className={`flex-1 flex flex-col items-center py-4 px-4 transition-all duration-300 ${
              activePage === 'entries' 
                ? 'text-white bg-white/10 glow-box' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
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
function CapturePageContent({ onOcrResult, userName }) {
  const isUsernameSet = userName && userName !== 'Guest';
  
  return (
    <div className="p-4 space-y-6">
      {/* Premium Username Warning */}
      {!isUsernameSet && (
        <div className="premium-card glow-box rounded-xl p-4 border border-white/10">
          <div className="flex items-center">
            <span className="text-yellow-400 mr-3 text-xl">⚠️</span>
            <div>
              <p className="text-gradient-premium font-medium">Username Required</p>
              <p className="text-gradient-accent text-sm mt-1">
                Please set your username first to start scanning business cards.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Premium Hero Section */}
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-4 premium-card rounded-full flex items-center justify-center glow-box">
          <span className="text-3xl">🃏</span>
        </div>
        <h2 className="text-2xl font-bold text-gradient-premium mb-2">
          AI Card Scanner Pro
        </h2>
        <p className="text-gradient-accent text-sm">
          Upload or capture a business card to extract contact information instantly
        </p>
      </div>

      {/* Premium Features */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="premium-card glow-box rounded-xl p-4 border border-white/10">
          <div className="text-center">
            <span className="text-2xl mb-2 block">⚡</span>
            <h3 className="font-semibold text-sm text-gradient-premium">Fast OCR</h3>
            <p className="text-xs text-gradient-accent mt-1">Instant text extraction</p>
          </div>
        </div>
        <div className="premium-card glow-box rounded-xl p-4 border border-white/10">
          <div className="text-center">
            <span className="text-2xl mb-2 block">☁️</span>
            <h3 className="font-semibold text-sm text-gradient-premium">Cloud Sync</h3>
            <p className="text-xs text-gradient-accent mt-1">Access anywhere</p>
          </div>
        </div>
      </div>

      {/* Upload Form - only show if username is set */}
      {isUsernameSet ? (
        <UploadForm onOcrResult={onOcrResult} />
      ) : (
        <div className="premium-card glow-box rounded-xl p-8 text-center border border-white/10">
          <span className="text-4xl mb-4 block opacity-50">📱</span>
          <p className="text-gradient-accent">Set your username to enable card scanning</p>
        </div>
      )}
    </div>
  );
}

// Premium Entries Page Component  
function EntriesPageContent({ entries, onExportPDF }) {
  return (
    <div className="p-4">
      {/* Premium Stats Card */}
      <div className="premium-card glow-box rounded-xl p-6 text-white mb-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 premium-card rounded-xl flex items-center justify-center glow-box">
              <span className="text-xl">💼</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gradient-premium">Card Collection</h3>
              <p className="text-xs text-gradient-accent">Professional contacts</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <p className="text-4xl font-bold text-gradient-premium mb-1">{entries.length}</p>
            <p className="text-sm text-gradient-accent">Business Cards Stored</p>
          </div>
          <div className="flex space-x-2">
            {entries.length > 0 && (
              <button
                onClick={onExportPDF}
                className="btn-premium px-4 py-2 rounded-xl text-xs font-medium glow-box flex items-center space-x-2"
              >
                <span>📄</span>
                <span>Export PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable entries={entries} onExportPDF={onExportPDF} />
    </div>
  );
}

export default App;
