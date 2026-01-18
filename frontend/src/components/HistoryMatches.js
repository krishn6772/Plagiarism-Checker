import React, { useState } from 'react';
import './HistoryMatches.css';

function HistoryMatches({ matches, onClose, title = "⚠️ Similar Content Found in History", currentText = "" }) {
  const [viewingHighlights, setViewingHighlights] = useState(null);

  const getSimilarityColor = (score) => {
    if (score >= 80) return '#dc3545';
    if (score >= 50) return '#ffc107';
    return '#28a745';
  };

  const formatMetadata = (metadata) => {
    if (!metadata) return null;
    
    return (
      <div className="metadata-info">
        {metadata.source && <span>📌 Source: {metadata.source.replace('_', ' ')}</span>}
        {metadata.filename && <span>📄 File: {metadata.filename}</span>}
        {metadata.word_count && <span>📝 Words: {metadata.word_count}</span>}
        {metadata.submitted_at && (
          <span>🕐 Submitted: {new Date(metadata.submitted_at).toLocaleString()}</span>
        )}
      </div>
    );
  };

  // Function to find matching sequences between two texts
  const findMatchingSequences = (text1, text2, minWords = 3) => {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const matches1 = new Set();
    const matches2 = new Set();

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

        if (matchLength >= minWords) {
          for (let k = 0; k < matchLength; k++) {
            matches1.add(i + k);
            matches2.add(j + k);
          }
        }
      }
    }

    return { matches1, matches2 };
  };

  // Function to highlight text based on matched word indices
  const highlightText = (text, matchedIndices) => {
    const words = text.split(/(\s+)/);
    let wordIndex = 0;

    return words.map((word, index) => {
      if (word.trim() === '') {
        return <span key={index}>{word}</span>;
      }

      const isMatch = matchedIndices.has(wordIndex);
      wordIndex++;

      if (isMatch) {
        return <mark key={index} className="highlight-match-inline">{word}</mark>;
      }
      return <span key={index}>{word}</span>;
    });
  };

  // Function to generate highlighted comparison
  const generateHighlightedComparison = (match) => {
    // Determine which text from history matched
    const historyText = match.matched_with === 'text1' 
      ? (match.original_text1.endsWith('...') 
          ? match.matched_text || match.matched_text_preview 
          : match.original_text1)
      : (match.original_text2.endsWith('...') 
          ? match.matched_text || match.matched_text_preview 
          : match.original_text2);

    // Use currentText if available, otherwise use a placeholder
    const currentTextToCompare = currentText || "Current text not available for comparison";

    // Find matching sequences
    const { matches1, matches2 } = findMatchingSequences(currentTextToCompare, historyText);

    return {
      currentHighlighted: highlightText(currentTextToCompare, matches1),
      historyHighlighted: highlightText(historyText, matches2),
      matchCount: matches1.size,
      historyText: historyText
    };
  };

  const handleViewHighlights = (match) => {
    const highlighted = generateHighlightedComparison(match);
    setViewingHighlights({ match, highlighted });
  };

  if (!matches || matches.matches.length === 0) {
    return null;
  }

  // If viewing highlights, show comparison view
  if (viewingHighlights) {
    return (
      <div className="history-matches-overlay" onClick={() => setViewingHighlights(null)}>
        <div className="history-matches-modal highlight-view-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>🔍 Similarity Highlight Comparison</h2>
            <button className="close-btn" onClick={() => setViewingHighlights(null)}>✕</button>
          </div>
          
          <div className="modal-content">
            <div className="highlight-info-bar">
              <div className="info-item">
                <strong>Similarity Score:</strong>
                <span 
                  className="similarity-badge-large"
                  style={{ backgroundColor: getSimilarityColor(viewingHighlights.match.similarity_score) }}
                >
                  {viewingHighlights.match.similarity_score}%
                </span>
              </div>
              <div className="info-item">
                <strong>Matching Words:</strong>
                <span className="match-count-badge">{viewingHighlights.highlighted.matchCount} words</span>
              </div>
              <div className="info-item">
                <strong>Matched From:</strong>
                <span>{viewingHighlights.match.matched_with === 'text1' ? 'Text 1' : 'Text 2'}</span>
              </div>
            </div>

            <div className="highlight-legend-box">
              <p><mark className="highlight-match-inline">Yellow highlight</mark> shows matching text between your current submission and the history record</p>
            </div>

            <div className="comparison-panels">
              <div className="comparison-panel">
                <h3>📝 Your Current Submission</h3>
                <div className="highlighted-content">
                  {viewingHighlights.highlighted.currentHighlighted}
                </div>
              </div>

              <div className="comparison-divider">
                <div className="divider-line"></div>
                <div className="divider-icon">⚡</div>
                <div className="divider-line"></div>
              </div>

              <div className="comparison-panel">
                <h3>📚 Matched History Record</h3>
                <div className="history-meta-mini">
                  <span>📅 {new Date(viewingHighlights.match.timestamp).toLocaleDateString()}</span>
                  {viewingHighlights.match.text_name && (
                    <span>📄 {viewingHighlights.match.text_name}</span>
                  )}
                </div>
                <div className="highlighted-content">
                  {viewingHighlights.highlighted.historyHighlighted}
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setViewingHighlights(null)}>
              ← Back to Matches
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default matches list view
  return (
    <div className="history-matches-overlay" onClick={onClose}>
      <div className="history-matches-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-content">
          <div className="matches-summary">
            <p><strong>{matches.matches_found}</strong> similar {matches.matches_found === 1 ? 'record' : 'records'} found</p>
            <p>Highest similarity: <span style={{ color: getSimilarityColor(matches.highest_similarity), fontWeight: 'bold' }}>
              {matches.highest_similarity}%
            </span></p>
          </div>

          <div className="matches-list">
            {matches.matches.map((match, index) => (
              <div key={match.history_id} className="match-card">
                <div className="match-header">
                  <span className="match-number">Match #{index + 1}</span>
                  <span 
                    className="match-score"
                    style={{ backgroundColor: getSimilarityColor(match.similarity_score) }}
                  >
                    {match.similarity_score}% Similar
                  </span>
                </div>
                
                {/* Show which text was matched */}
                {match.matched_with && (
                  <div className="match-target">
                    <strong>🎯 Matched With:</strong> {match.matched_with === 'text1' ? 'Text 1' : 'Text 2'}
                    {match.text_name && ` (${match.text_name})`}
                  </div>
                )}
                
                {/* Show metadata if available */}
                {match.text_metadata && formatMetadata(match.text_metadata)}
                
                {match.file_name && match.file_name !== 'Text Comparison' && (
                  <div className="match-file">
                    <strong>📄 File:</strong> {match.file_name}
                  </div>
                )}
                
                <div className="match-date">
                  <strong>📅 Date:</strong> {new Date(match.timestamp).toLocaleString()}
                </div>
                
                <div className="match-texts">
                  <div className="match-text-section">
                    <strong>Original Text 1:</strong>
                    <p>{match.original_text1}</p>
                  </div>
                  {match.original_text2 && match.original_text2 !== '[Google Only Check]' && (
                    <div className="match-text-section">
                      <strong>Original Text 2:</strong>
                      <p>{match.original_text2}</p>
                    </div>
                  )}
                </div>
                
                <div className="matched-content">
                  <strong>🔍 Matched Content:</strong>
                  <div className="matched-text">
                    {match.matched_text || match.matched_text_preview}
                  </div>
                </div>

                {/* NEW: View Highlights Button */}
                <div className="match-actions">
                  <button 
                    className="btn-view-highlights"
                    onClick={() => handleViewHighlights(match)}
                    disabled={!currentText}
                  >
                    🔍 View Similarity Highlights
                  </button>
                  {!currentText && (
                    <span className="text-muted-small">
                      (Full text comparison not available)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default HistoryMatches;