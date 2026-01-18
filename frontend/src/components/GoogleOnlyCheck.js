import React, { useState } from 'react';
import { checkGoogleOnly, searchInHistory } from '../api/api';
import GoogleSources from './GoogleSources';
import HistoryMatches from './HistoryMatches';
import './GoogleOnlyCheck.css';

function GoogleOnlyCheck({ onResult, getSimilarityColor }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [checkHistory, setCheckHistory] = useState(true);
  const [historyMatches, setHistoryMatches] = useState(null);
  const [showHistoryMatches, setShowHistoryMatches] = useState(false);
  const [checkingHistory, setCheckingHistory] = useState(false);

  // Check text against history
  const checkTextAgainstHistory = async (textToCheck) => {
    if (!checkHistory || !textToCheck || textToCheck.trim().length < 50) {
      return null;
    }

    console.log('🔍 Checking text against history...');
    setCheckingHistory(true);

    try {
      const response = await searchInHistory({
        text: textToCheck,
        min_similarity: 50.0
      });

      if (response.data.matches_found > 0) {
        console.log(`✅ Found ${response.data.matches_found} matches`);
        return response.data;
      }
      console.log('✅ No matches found');
      return null;
    } catch (error) {
      console.error('❌ Error checking history:', error);
      return null;
    } finally {
      setCheckingHistory(false);
    }
  };

  const handleCheck = async () => {
    if (!text.trim()) {
      alert('Please enter text to check');
      return;
    }

    setLoading(true);
    setResult(null);
    setHistoryMatches(null);
    setShowHistoryMatches(false);

    try {
      // STEP 1: Check history first
      if (checkHistory) {
        console.log('=== CHECKING HISTORY ===');
        const matchesData = await checkTextAgainstHistory(text);
        
        if (matchesData) {
          setHistoryMatches(matchesData);
          alert(
            `⚠️ TEXT FOUND IN YOUR HISTORY!\n\n` +
            `📝 Matches Found: ${matchesData.matches_found}\n` +
            `🎯 Highest Similarity: ${matchesData.highest_similarity}%\n\n` +
            `This text has been checked before.\n` +
            `Click OK to continue and view Google results.`
          );
          setShowHistoryMatches(true);
        }
      }

      // STEP 2: Check Google similarity
      console.log('=== CHECKING GOOGLE ===');
      const response = await checkGoogleOnly({ text });
      setResult(response.data);
      if (onResult) {
        onResult(response.data);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        alert('Google API is not configured. Please configure Google Custom Search API in backend settings.');
      } else {
        alert('Error checking Google similarity: ' + (error.response?.data?.detail || error.message));
      }
    } finally {
      setLoading(false);
      setCheckingHistory(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setText('');
    setHistoryMatches(null);
    setShowHistoryMatches(false);
  };

  return (
    <div className="google-only-check">
      <div className="google-only-header">
        <h2>🌐 Check Text Against Google Sources</h2>
        <p className="google-only-description">
          This feature searches Google to find if your text appears on any websites. 
          It helps identify potential plagiarism from online sources.
        </p>
      </div>

      {!result ? (
        <div className="google-only-input-section">
          <label>Enter Your Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your text here to check if it exists on Google..."
            rows="15"
            className="google-only-textarea"
          />
          
          <div className="text-info">
            {text.length} characters | {text.split(/\s+/).filter(w => w).length} words
          </div>

          {/* History Check Option */}
          <div className="google-check-options">
            <label>
              <input
                type="checkbox"
                checked={checkHistory}
                onChange={(e) => setCheckHistory(e.target.checked)}
              />
              <span>Check Against Past History First</span>
            </label>
          </div>
          
          <div className="google-only-info">
            <p>ℹ️ This will search Google for similar content and show you matching sources with highlighted text.</p>
            {checkHistory && (
              <p className="history-note">✅ Your text will also be checked against past submissions.</p>
            )}
          </div>

          <button 
            onClick={handleCheck} 
            className="btn-primary btn-google-check" 
            disabled={loading || checkingHistory || !text.trim()}
          >
            {checkingHistory ? (
              <>
                <span className="spinner-small"></span>
                🔍 Checking History...
              </>
            ) : loading ? (
              <>
                <span className="spinner-small"></span>
                🌐 Searching Google...
              </>
            ) : (
              <>🔍 Check on Google</>
            )}
          </button>
        </div>
      ) : (
        <div className="google-only-results">
          <div className="google-only-result-header">
            <h3>Google Search Results</h3>
            <button onClick={handleReset} className="btn-secondary">
              Check Another Text
            </button>
          </div>

          {/* Show History Match Status if found */}
          {historyMatches && (
            <div className="history-status-summary">
              <h3>📋 History Check Results:</h3>
              <div className="history-status-cards">
                <div 
                  className="history-status-card google-text-status"
                  data-severity={
                    historyMatches.highest_similarity >= 80 ? 'high' :
                    historyMatches.highest_similarity >= 50 ? 'medium' : 'low'
                  }
                >
                  <h4>📝 Checked Text</h4>
                  <p className="match-count">{historyMatches.matches_found} Match(es) Found</p>
                  <p className="highest-sim">Highest: {historyMatches.highest_similarity}%</p>
                  <button 
                    onClick={() => setShowHistoryMatches(true)} 
                    className="btn-view-matches"
                  >
                    View History Matches
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="result-card">
            <div className="result-item">
              <span className="result-label">Google Similarity:</span>
              <span
                className="result-value"
                style={{ color: getSimilarityColor(result.google_similarity) }}
              >
                {result.google_similarity}%
              </span>
            </div>
            <div className="result-message">
              <strong>{result.message}</strong>
            </div>
          </div>

          {/* Display Google Highlighted Text */}
          {result.google_highlighted_text && result.google_similarity > 0 && (
            <div className="google-highlighted-section">
              <h4>📝 Your Text with Matches Highlighted:</h4>
              <p className="highlight-info">
                <mark className="google-match">Green highlights</mark> show text segments found on Google
              </p>
              <div 
                className="google-highlighted-text"
                dangerouslySetInnerHTML={{ __html: result.google_highlighted_text }}
              />
            </div>
          )}

          {/* Display Google Sources */}
          {result.google_sources && result.google_sources.length > 0 && (
            <GoogleSources 
              sources={result.google_sources} 
              similarity={result.google_similarity}
              allMatches={result.all_google_matches}
            />
          )}

          {/* No matches found */}
          {result.google_similarity === 0 && (
            <div className="no-matches-found">
              <div className="no-matches-icon">✅</div>
              <h3>No Similar Content Found</h3>
              <p>Your text does not appear to match any content currently indexed by Google.</p>
              <p className="no-matches-note">
                Note: This doesn't guarantee 100% originality, but indicates your text is not widely available online.
              </p>
            </div>
          )}
        </div>
      )}

      {/* History Matches Modal */}
      {showHistoryMatches && historyMatches && (
        <HistoryMatches
          matches={historyMatches}
          onClose={() => setShowHistoryMatches(false)}
          title="📝 Google Check - History Matches"
          currentText={text}
        />
      )}
    </div>
  );
}

export default GoogleOnlyCheck;