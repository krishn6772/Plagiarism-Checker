import React, { useState, useEffect } from 'react';
import { checkPlagiarism, getMyHistory, deleteHistory, clearMyHistory, searchInHistory } from '../api/api';
import FileUpload from '../components/FileUpload';
import HistoryTable from '../components/HistoryTable';
import HistoryMatches from '../components/HistoryMatches';
import GoogleSources from '../components/GoogleSources';
import GoogleOnlyCheck from '../components/GoogleOnlyCheck';
import AIDetectionResult from '../components/AIDetectionResult';
import GoogleSimilarityViewer from '../components/GoogleSimilarityViewer';
import './Dashboard.css';

function UserDashboard({ user, onLogout }) {
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [checkGoogle, setCheckGoogle] = useState(false);
  const [checkAI, setCheckAI] = useState(false);
  const [checkHistory, setCheckHistory] = useState(true);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('check');
  const [highlightedText1, setHighlightedText1] = useState('');
  const [highlightedText2, setHighlightedText2] = useState('');
  const [historyMatches1, setHistoryMatches1] = useState(null);
  const [historyMatches2, setHistoryMatches2] = useState(null);
  const [showHistoryMatches1, setShowHistoryMatches1] = useState(false);
  const [showHistoryMatches2, setShowHistoryMatches2] = useState(false);
  const [checkingHistory, setCheckingHistory] = useState(false);
  const [showGoogleViewer, setShowGoogleViewer] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      const response = await getMyHistory();
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const findSimilarSequences = (text1, text2) => {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const matches1 = new Set();
    const matches2 = new Set();

    const minMatchLength = 3;

    for (let i = 0; i < words1.length; i++) {
      for (let j = 0; j < words2.length; j++) {
        let matchLength = 0;
        while (
          i + matchLength < words1.length &&
          j + matchLength < words2.length &&
          words1[i + matchLength] === words2[j + matchLength]
        ) {
          matchLength++;
        }

        if (matchLength >= minMatchLength) {
          for (let k = 0; k < matchLength; k++) {
            matches1.add(i + k);
            matches2.add(j + k);
          }
        }
      }
    }

    return { matches1, matches2 };
  };

  const highlightText = (text, matches) => {
    const words = text.split(/(\s+)/);
    let wordIndex = 0;

    return words.map((word, index) => {
      if (word.trim() === '') {
        return word;
      }

      const isMatch = matches.has(wordIndex);
      wordIndex++;

      if (isMatch) {
        return `<mark key="${index}" class="highlight-match">${word}</mark>`;
      }
      return word;
    }).join('');
  };

  // Check Text 1 against history
  const checkText1AgainstHistory = async (text) => {
    if (!checkHistory || !text || text.trim().length < 50) {
      return false;
    }

    console.log('🔍 Checking Text 1 against history...');

    try {
      const response = await searchInHistory({
        text: text,
        min_similarity: 50.0
      });

      if (response.data.matches_found > 0) {
        console.log(`✅ Text 1: Found ${response.data.matches_found} matches`);
        setHistoryMatches1(response.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking Text 1 history:', error);
      return false;
    }
  };

  // Check Text 2 against history
  const checkText2AgainstHistory = async (text) => {
    if (!checkHistory || !text || text.trim().length < 50) {
      return false;
    }

    console.log('🔍 Checking Text 2 against history...');

    try {
      const response = await searchInHistory({
        text: text,
        min_similarity: 50.0
      });

      if (response.data.matches_found > 0) {
        console.log(`✅ Text 2: Found ${response.data.matches_found} matches`);
        setHistoryMatches2(response.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking Text 2 history:', error);
      return false;
    }
  };

  const handleCheck = async () => {
    if (!text1 || !text2) {
      alert('Please enter both texts to compare');
      return;
    }

    setLoading(true);
    setResult(null);
    setHighlightedText1('');
    setHighlightedText2('');
    setHistoryMatches1(null);
    setHistoryMatches2(null);
    setShowHistoryMatches1(false);
    setShowHistoryMatches2(false);

    try {
      // Check both texts against history SEPARATELY
      if (checkHistory) {
        setCheckingHistory(true);
        console.log('=== Checking History for Both Texts Separately ===');

        const [match1Found, match2Found] = await Promise.all([
          checkText1AgainstHistory(text1),
          checkText2AgainstHistory(text2)
        ]);

        setCheckingHistory(false);

        // Show detailed results for both checks
        if (match1Found && match2Found) {
          const text1Matches = historyMatches1?.matches_found || 0;
          const text2Matches = historyMatches2?.matches_found || 0;
          const text1Similarity = historyMatches1?.highest_similarity || 0;
          const text2Similarity = historyMatches2?.highest_similarity || 0;
          
          alert(
            `⚠️ WARNING: BOTH TEXTS FOUND IN YOUR HISTORY!\n\n` +
            `📝 Text 1:\n` +
            `  • ${text1Matches} match(es) found\n` +
            `  • Highest similarity: ${text1Similarity}%\n\n` +
            `📝 Text 2:\n` +
            `  • ${text2Matches} match(es) found\n` +
            `  • Highest similarity: ${text2Similarity}%\n\n` +
            `Click OK to view detailed matches for both texts.`
          );
          setShowHistoryMatches1(true);
          setShowHistoryMatches2(true);
        } else if (match1Found) {
          const text1Matches = historyMatches1?.matches_found || 0;
          const text1Similarity = historyMatches1?.highest_similarity || 0;
          
          alert(
            `⚠️ WARNING: Text 1 Found in Your History!\n\n` +
            `📝 Text 1 Details:\n` +
            `  • ${text1Matches} match(es) found\n` +
            `  • Highest similarity: ${text1Similarity}%\n\n` +
            `Text 2: No matches found ✅\n\n` +
            `Click OK to view Text 1 matches.`
          );
          setShowHistoryMatches1(true);
        } else if (match2Found) {
          const text2Matches = historyMatches2?.matches_found || 0;
          const text2Similarity = historyMatches2?.highest_similarity || 0;
          
          alert(
            `⚠️ WARNING: Text 2 Found in Your History!\n\n` +
            `Text 1: No matches found ✅\n\n` +
            `📝 Text 2 Details:\n` +
            `  • ${text2Matches} match(es) found\n` +
            `  • Highest similarity: ${text2Similarity}%\n\n` +
            `Click OK to view Text 2 matches.`
          );
          setShowHistoryMatches2(true);
        } else {
          console.log('✅ No matches found for either text - new content');
        }
      }

      // Perform normal plagiarism check
      const response = await checkPlagiarism({
        text1,
        text2,
        check_google: checkGoogle,
        check_ai: checkAI
      });
      setResult(response.data);

      const { matches1, matches2 } = findSimilarSequences(text1, text2);
      const highlighted1 = highlightText(text1, matches1);
      const highlighted2 = highlightText(text2, matches2);

      setHighlightedText1(highlighted1);
      setHighlightedText2(highlighted2);
    } catch (error) {
      alert('Error checking plagiarism: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
      setCheckingHistory(false);
    }
  };

  const handleDeleteHistory = async (historyId) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteHistory(historyId);
        fetchHistory();
        alert('History record deleted successfully');
      } catch (error) {
        alert('Error deleting history: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all your history?')) {
      try {
        await clearMyHistory();
        fetchHistory();
        alert('History cleared successfully');
      } catch (error) {
        alert('Error clearing history: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const getSimilarityColor = (score) => {
    if (score >= 80) return '#dc3545';
    if (score >= 50) return '#ffc107';
    return '#28a745';
  };

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h1>Plagiarism Checker</h1>
        <div className="nav-right">
          <span className="user-info">Welcome, {user.username}</span>
          <button onClick={onLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'check' ? 'active' : ''}`}
            onClick={() => setActiveTab('check')}
          >
            Check Plagiarism
          </button>
          <button
            className={`tab ${activeTab === 'google' ? 'active' : ''}`}
            onClick={() => setActiveTab('google')}
          >
            🌐 Google Check
          </button>
          <button
            className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Files
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            My History
          </button>
        </div>

        {activeTab === 'check' && (
          <div className="tab-content">
            <h2>Compare Two Texts</h2>

            {checkHistory && (
              <div className="history-check-info">
                <p>📋 <strong>History Check Enabled - Separate Checking:</strong></p>
                <ul>
                  <li>✅ <strong>Text 1</strong> is checked SEPARATELY against all past submissions</li>
                  <li>✅ <strong>Text 2</strong> is checked SEPARATELY against all past submissions</li>
                  <li>🔍 Both texts are compared independently for maximum accuracy</li>
                  <li>📊 You'll see detailed results for each text individually</li>
                  <li>🔔 Separate alerts will show if either or both texts were previously submitted</li>
                </ul>
              </div>
            )}

            {!result ? (
              <div className="text-comparison">
                <div className="text-input-container">
                  <label>Text 1</label>
                  <textarea
                    value={text1}
                    onChange={(e) => setText1(e.target.value)}
                    placeholder="Enter first text here..."
                    rows="10"
                  />
                </div>
                <div className="text-input-container">
                  <label>Text 2</label>
                  <textarea
                    value={text2}
                    onChange={(e) => setText2(e.target.value)}
                    placeholder="Enter second text here..."
                    rows="10"
                  />
                </div>
              </div>
            ) : (
              <div className="text-comparison">
                <div className="text-input-container">
                  <label>Text 1 (Highlighted)</label>
                  <div
                    className="highlighted-text-display"
                    dangerouslySetInnerHTML={{ __html: highlightedText1 }}
                  />
                </div>
                <div className="text-input-container">
                  <label>Text 2 (Highlighted)</label>
                  <div
                    className="highlighted-text-display"
                    dangerouslySetInnerHTML={{ __html: highlightedText2 }}
                  />
                </div>
              </div>
            )}

            <div className="check-options">
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
                Check Against Past History (Both Texts Separately)
              </label>
            </div>

            <div className="button-group">
              <button onClick={handleCheck} className="btn-primary" disabled={loading || checkingHistory}>
                {checkingHistory ? (
                  <>
                    <span className="spinner-small"></span>
                    Checking History Separately...
                  </>
                ) : loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Checking...
                  </>
                ) : (
                  'Check Plagiarism'
                )}
              </button>
              {result && (
                <button
                  onClick={() => {
                    setResult(null);
                    setHighlightedText1('');
                    setHighlightedText2('');
                    setHistoryMatches1(null);
                    setHistoryMatches2(null);
                    setShowHistoryMatches1(false);
                    setShowHistoryMatches2(false);
                  }}
                  className="btn-secondary"
                >
                  Check Another
                </button>
              )}
            </div>

            {result && (
              <div className="result-container">
                <h3>Results</h3>
                <div className="result-card">
                  <div className="result-item">
                    <span className="result-label">Text Similarity:</span>
                    <span
                      className="result-value"
                      style={{ color: getSimilarityColor(result.similarity_score) }}
                    >
                      {result.similarity_score}%
                    </span>
                  </div>
                  {result.google_similarity !== null && (
                    <div className="result-item">
                      <span className="result-label">Google Similarity:</span>
                      <span
                        className="result-value"
                        style={{ color: getSimilarityColor(result.google_similarity) }}
                      >
                        {result.google_similarity}%
                      </span>
                    </div>
                  )}
                  <div className="result-message">
                    <strong>{result.message}</strong>
                  </div>
                  <div className="highlight-legend">
                    <p>
                      <mark className="highlight-match">Yellow highlight</mark> shows matching text between inputs | 
                      <mark className="google-match">Green highlight</mark> shows text found on Google |
                      <mark className="ai-pattern">Pink highlight</mark> shows AI patterns
                    </p>
                  </div>
                </div>
                
                {result.ai_detection && (
                  <AIDetectionResult aiResult={result.ai_detection} />
                )}
                
                {result.google_highlighted_text && result.google_similarity > 0 && (
                  <div className="google-highlighted-section">
                    <h4>🌐 Your Text with Google Matches Highlighted:</h4>
                    <div 
                      className="google-highlighted-text"
                      dangerouslySetInnerHTML={{ __html: result.google_highlighted_text }}
                    />
                  </div>
                )}
                
                {result.google_sources && result.google_sources.length > 0 && (
                  <GoogleSources 
                    sources={result.google_sources} 
                    similarity={result.google_similarity}
                    allMatches={result.all_google_matches}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'google' && (
          <div className="tab-content">
            <GoogleOnlyCheck 
              onResult={setResult}
              getSimilarityColor={getSimilarityColor}
            />
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="tab-content">
            <FileUpload onResult={setResult} />
            {result && (
              <div className="result-container">
                <h3>Results</h3>
                <div className="result-card">
                  <div className="result-item">
                    <span className="result-label">Text Similarity:</span>
                    <span
                      className="result-value"
                      style={{ color: getSimilarityColor(result.similarity_score) }}
                    >
                      {result.similarity_score}%
                    </span>
                  </div>
                  {result.google_similarity !== null && (
                    <div className="result-item">
                      <span className="result-label">Google Similarity:</span>
                      <span
                        className="result-value"
                        style={{ color: getSimilarityColor(result.google_similarity) }}
                      >
                        {result.google_similarity}%
                      </span>
                    </div>
                  )}
                  <div className="result-message">
                    <strong>{result.message}</strong>
                  </div>
                </div>
                
                {result.ai_detection && (
                  <AIDetectionResult aiResult={result.ai_detection} />
                )}
                
                {result.google_highlighted_text && result.google_similarity > 0 && (
                  <div className="google-highlighted-section">
                    <h4>🌐 Your Text with Google Matches Highlighted:</h4>
                    <div 
                      className="google-highlighted-text"
                      dangerouslySetInnerHTML={{ __html: result.google_highlighted_text }}
                    />
                  </div>
                )}
                
                {result.google_sources && result.google_sources.length > 0 && (
                  <GoogleSources 
                    sources={result.google_sources} 
                    similarity={result.google_similarity}
                    allMatches={result.all_google_matches}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="tab-content">
            <div className="history-header">
              <h2>My Plagiarism Check History</h2>
              {history.length > 0 && (
                <button onClick={handleClearHistory} className="btn-danger">
                  Clear All History
                </button>
              )}
            </div>
            <HistoryTable history={history} onDelete={handleDeleteHistory} />
          </div>
        )}
      </div>

      {/* History Matches Modal for Text 1 */}
      {showHistoryMatches1 && historyMatches1 && (
        <HistoryMatches
          matches={historyMatches1}
          onClose={() => setShowHistoryMatches1(false)}
          title="📝 Text 1 - History Matches"
          currentText={text1}
        />
      )}

      {/* History Matches Modal for Text 2 */}
      {showHistoryMatches2 && historyMatches2 && (
        <HistoryMatches
          matches={historyMatches2}
          onClose={() => setShowHistoryMatches2(false)}
          title="📝 Text 2 - History Matches"
          currentText={text2}
        />
      )}

      {/* Google Similarity Viewer */}
      {showGoogleViewer && result && result.google_sources && (
        <GoogleSimilarityViewer
          currentText={text1}
          googleSources={result.google_sources}
          googleHighlightedText={result.google_highlighted_text}
          allGoogleMatches={result.all_google_matches}
          similarity={result.google_similarity}
          onClose={() => setShowGoogleViewer(false)}
        />
      )}
    </div>
  );
}

export default UserDashboard;