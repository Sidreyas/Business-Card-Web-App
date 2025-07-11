import React, { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import DataTable from './components/DataTable';
import CommentModal from './components/CommentModal';
import { businessCardAPI } from './services/api';
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
  
  // Phone regex (various formats)
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})|(\+\d{1,3}[-.\s]?)?\d{8,15}/g;
  
  // Website regex
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?/g;
  
  // Common title keywords
  const titleKeywords = [
    'CEO', 'CTO', 'CFO', 'COO', 'President', 'Director', 'Manager', 'Senior', 'Lead', 
    'Engineer', 'Developer', 'Designer', 'Analyst', 'Consultant', 'Specialist', 
    'Executive', 'Vice President', 'VP', 'Assistant', 'Coordinator', 'Supervisor'
  ];
  
  // Common company indicators
  const companyIndicators = [
    'Inc', 'Corp', 'Corporation', 'LLC', 'Ltd', 'Limited', 'Company', 'Co.',
    'Solutions', 'Services', 'Systems', 'Technologies', 'Tech', 'Group', 'Associates'
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
    if (websiteMatch && !parsed.website) {
      parsed.website = websiteMatch[0];
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

  // Remaining lines could be address
  const addressLines = lines.filter(line => 
    line !== parsed.name && 
    line !== parsed.title && 
    line !== parsed.company && 
    line !== parsed.email && 
    line !== parsed.phone && 
    line !== parsed.website &&
    line.length > 5
  );
  
  if (addressLines.length > 0) {
    parsed.address = addressLines.join(', ');
  }

  return parsed;
};

function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentImageFile, setCurrentImageFile] = useState(null);
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [dbInitialized, setDbInitialized] = useState(false);

  // Load username and entries from database on component mount
  useEffect(() => {
    const savedUserName = localStorage.getItem('businessCardOcrUserName');
    if (savedUserName) {
      setUserName(savedUserName);
      setShowNameInput(false);
      // Load entries for this user
      loadUserEntries(savedUserName);
    }
    
    // Initialize database on first load
    initializeDatabase();
  }, []);

  // Save username to localStorage when it changes
  useEffect(() => {
    if (userName) {
      localStorage.setItem('businessCardOcrUserName', userName);
      loadUserEntries(userName);
    }
  }, [userName]);

  // Initialize database
  const initializeDatabase = async () => {
    try {
      console.log('Initializing database...');
      await businessCardAPI.initializeDatabase();
      setDbInitialized(true);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Continue without database - fallback to localStorage
    }
  };

  // Load entries for a user
  const loadUserEntries = async (user) => {
    try {
      setLoading(true);
      const response = await businessCardAPI.getEntries(user, { includeStats: true });
      setEntries(response.entries || []);
      console.log(`Loaded ${response.entries?.length || 0} entries for user: ${user}`);
    } catch (error) {
      console.error('Failed to load entries:', error);
      // Fallback to empty array
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOcrResult = (imageFile) => {
    setCurrentImageFile(imageFile);
    setShowModal(true);
  };

  const handleSaveComment = async (comment) => {
    if (!currentImageFile) {
      console.error('No image file to upload');
      return;
    }

    try {
      setLoading(true);
      console.log('Uploading business card...');
      
      // Upload to database API
      const result = await businessCardAPI.uploadBusinessCard(
        currentImageFile,
        userName,
        comment
      );

      console.log('Upload successful:', result);

      // Refresh entries list
      await loadUserEntries(userName);

      setShowModal(false);
      setCurrentImageFile(null);

    } catch (error) {
      console.error('Failed to save business card:', error);
      alert(`Failed to save business card: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Add title
    doc.setFontSize(20);
    doc.text('Business Card OCR Report', 20, 25);
    
    // Add generation metadata below title
    doc.setFontSize(12);
    doc.text(`Generated on ${new Date().toLocaleDateString()} by ${userName}`, 20, 35);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Business Card OCR
          </h1>
          <p className="text-xl text-gray-300 font-light">
            Extract contact information with AI-powered precision
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-gray-500 to-white mx-auto mt-4 rounded-full"></div>
        </div>
        
        {/* Username Input Modal */}
        {showNameInput && (
          <div className="fixed inset-0 bg-gradient-to-br from-black/80 via-gray-900/90 to-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
              <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 rounded-t-2xl">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-black bg-clip-text text-transparent">
                  Welcome to Business Card OCR
                </h3>
                <p className="text-sm text-gray-600 mt-2 font-medium">
                  Please enter your name to get started
                </p>
              </div>
              <div className="px-6 py-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Your Name:
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && userName.trim()) {
                      setShowNameInput(false);
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    if (userName.trim()) {
                      setShowNameInput(false);
                    } else {
                      alert('Please enter your name to continue');
                    }
                  }}
                  disabled={!userName.trim()}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    userName.trim()
                      ? 'bg-gradient-to-r from-gray-800 to-black text-white hover:from-gray-700 hover:to-gray-900 transform hover:scale-105 shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {!showNameInput && (
          <>
            {/* User Info Bar */}
            <div className="mb-8 bg-gradient-to-r from-gray-800 to-black rounded-lg p-4 shadow-lg">
              <div className="flex justify-between items-center text-white">
                <div className="flex items-center space-x-3">
                  <span className="font-medium">Welcome, {userName}!</span>
                </div>
                <button
                  onClick={() => {
                    setUserName('');
                    setShowNameInput(true);
                    localStorage.removeItem('businessCardOcrUserName');
                  }}
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Change User
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <UploadForm onOcrResult={handleOcrResult} />
              </div>
              <div>
                <DataTable entries={entries} onExportPDF={handleExportPDF} />
              </div>
            </div>
          </>
        )}

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
