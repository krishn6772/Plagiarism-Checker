import React, { useState, useEffect } from 'react';
import { checkPlagiarism, getMyHistory, deleteHistory, clearMyHistory, searchInHistory } from '../api/api';
import FileUpload from '../components/FileUpload';
import HistoryTable from '../components/HistoryTable';
import HistoryMatches from '../components/HistoryMatches';
import GoogleSources from '../components/GoogleSources';
import GoogleOnlyCheck from '../components/GoogleOnlyCheck';
import AIDetectionResult from '../components/AIDetectionResult';
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

  const checkText1AgainstHistory = async (text) => {
    if (!checkHistory || !text || text.trim().length < 50) {
      return null;
    }

    console.log('🔍 Checking Text 1 against history...');

    try {
      const response = await searchInHistory({
        text: text,
        min_similarity: 50.0
      });

      if (response.data.matches_found > 0) {
        console.log(`✅ Text 1: Found ${response.data.matches_found} matches`);
        return response.data;
      }
      console.log('✅ Text 1: No matches found');
      return null;
    } catch (error) {
      console.error('❌ Error checking Text 1 history:', error);
      return null;
    }
  };

  const checkText2AgainstHistory = async (text) => {
    if (!checkHistory || !text || text.trim().length < 50) {
      return null;
    }

    console.log('🔍 Checking Text 2 against history...');

    try {
      const response = await searchInHistory({
        text: text,
        min_similarity: 50.0
      });

      if (response.data.matches_found > 0) {
        console.log(`✅ Text 2: Found ${response.data.matches_found} matches`);
        return response.data;
      }
      console.log('✅ Text 2: No matches found');
      return null;
    } catch (error) {
      console.error('❌ Error checking Text 2 history:', error);
      return null;
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
      if (checkHistory) {
        setCheckingHistory(true);
        console.log('=== 🔍 Checking History for Both Texts (SEPARATELY) ===');

        const [matches1Data, matches2Data] = await Promise.all([
          checkText1AgainstHistory(text1),
          checkText2AgainstHistory(text2)
        ]);

        setCheckingHistory(false);

        if (matches1Data) {
          setHistoryMatches1(matches1Data);
        }
        if (matches2Data) {
          setHistoryMatches2(matches2Data);
        }

        if (matches1Data && matches2Data) {
          alert(
            `⚠️ WARNING: BOTH TEXTS FOUND IN YOUR HISTORY!\n\n` +
            `📝 Text 1:\n` +
            `  • ${matches1Data.matches_found} match(es) found\n` +
            `  • Highest similarity: ${matches1Data.highest_similarity}%\n\n` +
            `📝 Text 2:\n` +
            `  • ${matches2Data.matches_found} match(es) found\n` +
            `  • Highest similarity: ${matches2Data.highest_similarity}%\n\n` +
            `Click OK to view detailed matches for both texts.`
          );
          setShowHistoryMatches1(true);
          setShowHistoryMatches2(true);
        } else if (matches1Data) {
          alert(
            `⚠️ WARNING: Text 1 Found in Your History!\n\n` +
            `📝 Text 1 Details:\n` +
            `  • ${matches1Data.matches_found} match(es) found\n` +
            `  • Highest similarity: ${matches1Data.highest_similarity}%\n\n` +
            `✅ Text 2: No matches found (new content)\n\n` +
            `Click OK to view Text 1 matches.`
          );
          setShowHistoryMatches1(true);
        } else if (matches2Data) {
          alert(
            `⚠️ WARNING: Text 2 Found in Your History!\n\n` +
            `✅ Text 1: No matches found (new content)\n\n` +
            `📝 Text 2 Details:\n` +
            `  • ${matches2Data.matches_found} match(es) found\n` +
            `  • ${matches2Data.highest_similarity}%\n\n` +
            `Click OK to view Text 2 matches.`
          );
          setShowHistoryMatches2(true);
        } else {
          console.log('✅ No matches found for either text - Both are new content');
        }
      }

      console.log('📊 Performing text comparison...');
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
                <p>📋 <strong>Separate History Check Enabled:</strong></p>
                <ul>
                  <li>✅ <strong>Text 1</strong> is checked independently against your entire submission history</li>
                  <li>✅ <strong>Text 2</strong> is checked independently against your entire submission history</li>
                  <li>🔍 Both texts are analyzed <strong>separately</strong> for maximum accuracy</li>
                  <li>📊 You'll see detailed match information for each text individually</li>
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
                  <div className="text-info">
                    {text1.length} characters | {text1.split(/\s+/).filter(w => w).length} words
                  </div>
                </div>
                <div className="text-input-container">
                  <label>Text 2</label>
                  <textarea
                    value={text2}
                    onChange={(e) => setText2(e.target.value)}
                    placeholder="Enter second text here..."
                    rows="10"
                  />
                  <div className="text-info">
                    {text2.length} characters | {text2.split(/\s+/).filter(w => w).length} words
                  </div>
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
                Check Google Similarity (Both Texts Separately)
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
                Check Both Texts Separately Against Past History
              </label>
            </div>

            <div className="button-group">
              <button onClick={handleCheck} className="btn-primary" disabled={loading || checkingHistory}>
                {checkingHistory ? (
                  <>
                    <span className="spinner-small"></span>
                    🔍 Checking History Separately...
                  </>
                ) : loading ? (
                  <>
                    <span className="spinner-small"></span>
                    ⏳ Checking Plagiarism...
                  </>
                ) : (
                  '✅ Check Plagiarism'
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
                  🔄 Check Another
                </button>
              )}
            </div>

            {(historyMatches1 || historyMatches2) && (
              <div className="history-status-summary">
                <h3>📋 History Check Results:</h3>
                <div className="history-status-cards">
                  {historyMatches1 && (
                    <div 
                      className="history-status-card text1-status"
                      data-severity={
                        historyMatches1.highest_similarity >= 80 ? 'high' :
                        historyMatches1.highest_similarity >= 50 ? 'medium' : 'low'
                      }
                    >
                      <h4>📝 Text 1</h4>
                      <p className="match-count">{historyMatches1.matches_found} Match(es) Found</p>
                      <p className="highest-sim">Highest: {historyMatches1.highest_similarity}%</p>
                      <button onClick={() => setShowHistoryMatches1(true)} className="btn-view-matches">
                        View Details
                      </button>
                    </div>
                  )}
                  {historyMatches2 && (
                    <div 
                      className="history-status-card text2-status"
                      data-severity={
                        historyMatches2.highest_similarity >= 80 ? 'high' :
                        historyMatches2.highest_similarity >= 50 ? 'medium' : 'low'
                      }
                    >
                      <h4>📝 Text 2</h4>
                      <p className="match-count">{historyMatches2.matches_found} Match(es) Found</p>
                      <p className="highest-sim">Highest: {historyMatches2.highest_similarity}%</p>
                      <button onClick={() => setShowHistoryMatches2(true)} className="btn-view-matches">
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {result && (
              <div className="result-container">
                <h3>Results</h3>
                
                {/* Main Similarity Result */}
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

                {/* Separate Google Results for Text 1 and Text 2 */}
                {checkGoogle && (result.google_similarity_text1 !== null || result.google_similarity_text2 !== null) && (
                  <div className="google-results-section">
                    <h3>🌐 Google Similarity Results (Checked Separately)</h3>
                    
                    <div className="google-comparison-cards">
                      {/* Text 1 Google Results */}
                      {result.google_similarity_text1 !== null && (
                        <div className="google-result-card text1-google">
                          <div className="google-card-header">
                            <h4>📝 Text 1 - Google Check</h4>
                            <span 
                              className="google-score-badge"
                              style={{ backgroundColor: getSimilarityColor(result.google_similarity_text1) }}
                            >
                              {result.google_similarity_text1}%
                            </span>
                          </div>
                          
                          {result.google_highlighted_text1 && result.google_similarity_text1 > 0 && (
                            <div className="google-mini-preview">
                              <p className="preview-label">Matched segments found online:</p>
                              <div 
                                className="mini-highlighted-text"
                                dangerouslySetInnerHTML={{ __html: result.google_highlighted_text1.substring(0, 200) + '...' }}
                              />
                            </div>
                          )}
                          
                          {result.google_sources_text1 && result.google_sources_text1.length > 0 && (
                            <div className="source-count">
                              📚 {result.google_sources_text1.length} source(s) found
                            </div>
                          )}
                          
                          {result.google_similarity_text1 === 0 && (
                            <p className="no-google-match">✅ No similar content found on Google</p>
                          )}
                        </div>
                      )}

                      {/* Text 2 Google Results */}
                      {result.google_similarity_text2 !== null && (
                        <div className="google-result-card text2-google">
                          <div className="google-card-header">
                            <h4>📝 Text 2 - Google Check</h4>
                            <span 
                              className="google-score-badge"
                              style={{ backgroundColor: getSimilarityColor(result.google_similarity_text2) }}
                            >
                              {result.google_similarity_text2}%
                            </span>
                          </div>
                          
                          {result.google_highlighted_text2 && result.google_similarity_text2 > 0 && (
                            <div className="google-mini-preview">
                              <p className="preview-label">Matched segments found online:</p>
                              <div 
                                className="mini-highlighted-text"
                                dangerouslySetInnerHTML={{ __html: result.google_highlighted_text2.substring(0, 200) + '...' }}
                              />
                            </div>
                          )}
                          
                          {result.google_sources_text2 && result.google_sources_text2.length > 0 && (
                            <div className="source-count">
                              📚 {result.google_sources_text2.length} source(s) found
                            </div>
                          )}
                          
                          {result.google_similarity_text2 === 0 && (
                            <p className="no-google-match">✅ No similar content found on Google</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Detailed Google Sources for Text 1 */}
                    {result.google_sources_text1 && result.google_sources_text1.length > 0 && (
                      <GoogleSources 
                        sources={result.google_sources_text1} 
                        similarity={result.google_similarity_text1}
                        allMatches={result.all_google_matches_text1}
                        title="📝 Text 1 - Google Sources"
                      />
                    )}

                    {/* Detailed Google Sources for Text 2 */}
                    {result.google_sources_text2 && result.google_sources_text2.length > 0 && (
                      <GoogleSources 
                        sources={result.google_sources_text2} 
                        similarity={result.google_similarity_text2}
                        allMatches={result.all_google_matches_text2}
                        title="📝 Text 2 - Google Sources"
                      />
                    )}
                  </div>
                )}
                
                {result.ai_detection && (
                  <AIDetectionResult aiResult={result.ai_detection} />
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
            <FileUpload onResult={setResult} getSimilarityColor={getSimilarityColor} />
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

      {showHistoryMatches1 && historyMatches1 && (
        <HistoryMatches
          matches={historyMatches1}
          onClose={() => setShowHistoryMatches1(false)}
          title="📝 Text 1 - History Matches"
          currentText={text1}
        />
      )}

      {showHistoryMatches2 && historyMatches2 && (
        <HistoryMatches
          matches={historyMatches2}
          onClose={() => setShowHistoryMatches2(false)}
          title="📝 Text 2 - History Matches"
          currentText={text2}
        />
      )}
    </div>
  );
}

export default UserDashboard;