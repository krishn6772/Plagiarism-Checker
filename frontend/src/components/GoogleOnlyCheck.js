import React, { useState } from 'react';
import GoogleSources from './GoogleSources';
import './GoogleOnlyCheck.css';

function GoogleOnlyCheck({ onResult, getSimilarityColor }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = async () => {
    if (!text.trim()) {
      alert('Please enter text to check');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { checkGoogleOnly } = require('../api/api');
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
    }
  };

  const handleReset = () => {
    setResult(null);
    setText('');
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
          
          <div className="google-only-info">
            <p>ℹ️ This will search Google for similar content and show you matching sources with highlighted text.</p>
          </div>

          <button 
            onClick={handleCheck} 
            className="btn-primary btn-google-check" 
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Searching Google...
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
    </div>
  );
}

export default GoogleOnlyCheck;