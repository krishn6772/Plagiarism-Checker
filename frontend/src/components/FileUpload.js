import React, { useState } from 'react';
import { uploadFiles, checkFileHistory } from '../api/api';
import HistoryMatches from './HistoryMatches';
import './FileUpload.css';

function FileUpload({ onResult }) {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [checkGoogle, setCheckGoogle] = useState(false);
  const [checkAI, setCheckAI] = useState(false);
  const [checkHistory, setCheckHistory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dragActive1, setDragActive1] = useState(false);
  const [dragActive2, setDragActive2] = useState(false);
  const [historyMatches, setHistoryMatches] = useState(null);
  const [showHistoryMatches, setShowHistoryMatches] = useState(false);
  const [checkingHistory, setCheckingHistory] = useState(false);

  const handleFile1Change = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file, setFile1);
    }
  };

  const handleFile2Change = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file, setFile2);
    }
  };

  const validateAndSetFile = (file, setter) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Only PDF, DOCX, and TXT files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setter(file);
  };

  const handleDrag = (e, setDragActive) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop1 = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive1(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0], setFile1);
    }
  };

  const handleDrop2 = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive2(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0], setFile2);
    }
  };

  // Check ANY file type against history using backend API
  const checkFileAgainstHistory = async (file) => {
    if (!checkHistory) {
      console.log('History check disabled');
      return false;
    }

    console.log(`🔍 Checking ${file.name} against history...`);
    setCheckingHistory(true);

    try {
      // Create FormData with the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('min_similarity', '50.0');

      console.log('Sending file to backend for history check...');

      // Call backend API
      const response = await checkFileHistory(formData);

      console.log('History check response:', response.data);

      if (response.data.matches_found > 0) {
        console.log(`✅ Found ${response.data.matches_found} matches!`);
        
        // Transform the response to match HistoryMatches component format
        const transformedMatches = {
          matches_found: response.data.matches_found,
          highest_similarity: response.data.highest_similarity,
          matches: response.data.matches.map(match => ({
            history_id: match.history_id,
            user_id: 'current_user',
            similarity_score: match.similarity_score,
            timestamp: match.timestamp,
            matched_text: match.matched_text_preview,
            original_text1: match.original_text1_preview,
            original_text2: match.original_text2_preview,
            file_name: match.file_name
          }))
        };

        setHistoryMatches(transformedMatches);
        setShowHistoryMatches(true);
        
        alert(
          `⚠️ SIMILARITY DETECTED!\n\n` +
          `File: ${file.name}\n` +
          `Matches Found: ${response.data.matches_found}\n` +
          `Highest Similarity: ${response.data.highest_similarity}%\n\n` +
          `View details in the popup to see matching submissions.`
        );
        
        return true;
      } else {
        console.log('✅ No matches found - new content');
        alert(
          `✅ No Similar Content Found\n\n` +
          `File: ${file.name}\n` +
          `This appears to be new content not previously submitted.`
        );
      }

      return false;
    } catch (error) {
      console.error('❌ History check error:', error);
      alert(`Error checking history:\n${error.response?.data?.detail || error.message}`);
      return false;
    } finally {
      setCheckingHistory(false);
    }
  };

  const handleUpload = async () => {
    if (!file1 || !file2) {
      alert('Please select both files to compare');
      return;
    }

    console.log('=== FILE UPLOAD STARTED ===');
    console.log(`File 1: ${file1.name} (${file1.type})`);
    console.log(`File 2: ${file2.name} (${file2.type})`);

    setHistoryMatches(null);
    setShowHistoryMatches(false);

    try {
      // STEP 1: Check file1 against history
      if (checkHistory) {
        console.log('STEP 1: Checking file against history...');
        await checkFileAgainstHistory(file1);
      }

      // STEP 2: Upload and compare files
      console.log('STEP 2: Uploading files for comparison...');
      setLoading(true);

      const formData = new FormData();
      formData.append('file1', file1);
      formData.append('file2', file2);
      formData.append('check_google', checkGoogle);
      formData.append('check_ai', checkAI);

      const response = await uploadFiles(formData);
      
      console.log('✅ Upload successful:', response.data);
      
      onResult(response.data);
      
      // Build success message
      let message = `✅ FILES COMPARED SUCCESSFULLY!\n\n`;
      message += `📄 File 1: ${file1.name}\n`;
      message += `📄 File 2: ${file2.name}\n`;
      message += `📊 Similarity: ${response.data.similarity_score}%\n`;
      
      if (response.data.google_similarity !== null) {
        message += `🌐 Google Similarity: ${response.data.google_similarity}%\n`;
      }
      
      if (response.data.ai_detection) {
        message += `🤖 AI Probability: ${response.data.ai_detection.ai_probability}%\n`;
      }
      
      message += `\n${response.data.message}`;

      alert(message);

    } catch (error) {
      console.error('❌ Upload error:', error);
      alert(`❌ Error:\n${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
      console.log('=== UPLOAD COMPLETE ===');
    }
  };

  const removeFile = (setter) => {
    setter(null);
  };

  const getFileIcon = (file) => {
    if (!file) return '📄';
    if (file.type === 'application/pdf') return '📕';
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      return '📘';
    return '📄';
  };

  const getFileTypeLabel = (file) => {
    if (!file) return '';
    if (file.type === 'text/plain') return 'TXT';
    if (file.type === 'application/pdf') return 'PDF';
    return 'DOCX';
  };

  return (
    <div className="file-upload-container">
      <h2>Upload Files to Compare</h2>
      <p className="file-info">Supported formats: PDF, DOCX, TXT (Max 10MB each)</p>

      {checkHistory && (
        <div className="history-check-info">
          <p>📋 <strong>History Check Enabled:</strong></p>
          <ul>
            <li>✅ ALL file types (TXT, PDF, DOCX) are checked against your history</li>
            <li>⚡ Files are checked BEFORE comparison</li>
            <li>🔔 You'll be alerted if similar content is found</li>
            <li>💾 All files are stored in history for future checks</li>
          </ul>
        </div>
      )}

      <div className="upload-sections">
        <div className="upload-section">
          <h3>File 1</h3>
          <div
            className={`drop-zone ${dragActive1 ? 'drag-active' : ''} ${file1 ? 'has-file' : ''}`}
            onDragEnter={(e) => handleDrag(e, setDragActive1)}
            onDragLeave={(e) => handleDrag(e, setDragActive1)}
            onDragOver={(e) => handleDrag(e, setDragActive1)}
            onDrop={handleDrop1}
          >
            {!file1 ? (
              <>
                <div className="drop-icon">📤</div>
                <p>Drag & drop file here</p>
                <p className="or-text">or</p>
                <label htmlFor="file1" className="btn-secondary">
                  Browse Files
                </label>
                <input
                  type="file"
                  id="file1"
                  onChange={handleFile1Change}
                  accept=".pdf,.docx,.txt"
                  style={{ display: 'none' }}
                />
              </>
            ) : (
              <div className="file-preview">
                <div className="file-icon">{getFileIcon(file1)}</div>
                <div className="file-details">
                  <p className="file-name">{file1.name}</p>
                  <p className="file-size">{(file1.size / 1024).toFixed(2)} KB</p>
                  <p className="file-type">{getFileTypeLabel(file1)}</p>
                </div>
                <button onClick={() => removeFile(setFile1)} className="btn-remove">
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="upload-section">
          <h3>File 2</h3>
          <div
            className={`drop-zone ${dragActive2 ? 'drag-active' : ''} ${file2 ? 'has-file' : ''}`}
            onDragEnter={(e) => handleDrag(e, setDragActive2)}
            onDragLeave={(e) => handleDrag(e, setDragActive2)}
            onDragOver={(e) => handleDrag(e, setDragActive2)}
            onDrop={handleDrop2}
          >
            {!file2 ? (
              <>
                <div className="drop-icon">📤</div>
                <p>Drag & drop file here</p>
                <p className="or-text">or</p>
                <label htmlFor="file2" className="btn-secondary">
                  Browse Files
                </label>
                <input
                  type="file"
                  id="file2"
                  onChange={handleFile2Change}
                  accept=".pdf,.docx,.txt"
                  style={{ display: 'none' }}
                />
              </>
            ) : (
              <div className="file-preview">
                <div className="file-icon">{getFileIcon(file2)}</div>
                <div className="file-details">
                  <p className="file-name">{file2.name}</p>
                  <p className="file-size">{(file2.size / 1024).toFixed(2)} KB</p>
                  <p className="file-type">{getFileTypeLabel(file2)}</p>
                </div>
                <button onClick={() => removeFile(setFile2)} className="btn-remove">
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="upload-options">
        <label>
          <input
            type="checkbox"
            checked={checkGoogle}
            onChange={(e) => setCheckGoogle(e.target.checked)}
          />
          Check Google Similarity
        </label>
        <label>
          <input
            type="checkbox"
            checked={checkAI}
            onChange={(e) => setCheckAI(e.target.checked)}
          />
          Check AI Content
        </label>
        <label>
          <input
            type="checkbox"
            checked={checkHistory}
            onChange={(e) => setCheckHistory(e.target.checked)}
          />
          Check Against Past History
        </label>
      </div>

      <button
        onClick={handleUpload}
        className="btn-primary btn-upload"
        disabled={loading || !file1 || !file2 || checkingHistory}
      >
        {checkingHistory ? (
          <>
            <span className="spinner-small"></span>
            Checking History...
          </>
        ) : loading ? (
          <>
            <span className="spinner-small"></span>
            Processing Files...
          </>
        ) : (
          '📊 Compare Files'
        )}
      </button>

      {/* History Matches Modal */}
      {showHistoryMatches && historyMatches && (
        <HistoryMatches
          matches={historyMatches}
          onClose={() => setShowHistoryMatches(false)}
        />
      )}
    </div>
  );
}

export default FileUpload;