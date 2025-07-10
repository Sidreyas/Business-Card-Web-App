import React, { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import DataTable from './components/DataTable';
import CommentModal from './components/CommentModal';
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

  // Load entries from localStorage on component mount
  useEffect(() => {
    const savedEntries = localStorage.getItem('businessCardOcrEntries');
    if (savedEntries) {
      try {
        const parsedEntries = JSON.parse(savedEntries);
        setEntries(parsedEntries);
        if (parsedEntries.length > 0) {
          setNotification(`Loaded ${parsedEntries.length} saved business card${parsedEntries.length > 1 ? 's' : ''} from your device.`);
          setTimeout(() => setNotification(''), 3000);
        }
      } catch (error) {
        console.error('Error parsing saved entries:', error);
        // If there's an error, start with empty array
        setEntries([]);
      }
    }
  }, []);

  // Save entries to localStorage whenever entries change
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
            Business Card OCR
          </h1>
          <p className="text-sm sm:text-lg text-gray-600">
            Extract contact information from business cards with AI
          </p>
        </div>

        {/* User Info Bar */}
        <div className="mb-4 sm:mb-8 bg-gradient-to-r from-gray-800 to-black rounded-lg p-3 sm:p-4 shadow-lg">
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center space-x-3">
              <span className="text-sm sm:text-base font-medium">Welcome, {userName}!</span>
            </div>
            <button
              onClick={() => {
                const newName = prompt('Enter your name:', userName);
                if (newName && newName.trim()) {
                  setUserName(newName.trim());
                }
              }}
              className="text-xs sm:text-sm text-gray-300 hover:text-white transition-colors"
            >
              Change User
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className="mb-4 sm:mb-8 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 shadow-sm">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span className="text-green-800 text-sm sm:text-base">{notification}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          <div>
            <UploadForm onOcrResult={handleOcrResult} />
          </div>
          <div>
            <DataTable entries={entries} onExportPDF={handleExportPDF} onClearData={handleClearData} />
          </div>
        </div>

        <CommentModal 
          show={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSaveComment}
          parsedData={currentParsedData}
          userName={userName}
        />
      </div>
    </div>
  );
}

export default App;
