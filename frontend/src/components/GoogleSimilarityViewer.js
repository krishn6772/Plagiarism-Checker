import React, { useState } from 'react';
import './GoogleSimilarityViewer.css';

function GoogleSimilarityViewer({ 
  currentText, 
  googleSources, 
  googleHighlightedText,
  allGoogleMatches,
  similarity,
  onClose 
}) {
  const [selectedSource, setSelectedSource] = useState(null);

  const getSimilarityColor = (score) => {
    if (score >= 80) return '#dc3545';
    if (score >= 50) return '#ffc107';
    return '#28a745';
  };

  // Function to find matching sequences between current text and source snippet
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
        return <mark key={index} className="google-match-highlight">{word}</mark>;
      }
      return <span key={index}>{word}</span>;
    });
  };

  const handleViewSource = (source) => {
    const { matches1, matches2 } = findMatchingSequences(currentText, source.snippet);
    
    setSelectedSource({
      ...source,
      currentHighlighted: highlightText(currentText, matches1),
      sourceHighlighted: highlightText(source.snippet, matches2),
      matchCount: matches1.size
    });
  };

  if (selectedSource) {
    return (
      <div className="google-viewer-overlay" onClick={() => setSelectedSource(null)}>
        <div className="google-viewer-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>🌐 Google Source Comparison</h2>
            <button className="close-btn" onClick={() => setSelectedSource(null)}>✕</button>
          </div>
          
          <div className="modal-content">
            <div className="google-info-bar">
              <div className="info-item">
                <strong>Similarity:</strong>
                <span 
                  className="similarity-badge-large"
                  style={{ backgroundColor: getSimilarityColor(selectedSource.similarity) }}
                >
                  {selectedSource.similarity}%
                </span>
              </div>
              <div className="info-item">
                <strong>Matching Words:</strong>
                <span className="match-count-badge">{selectedSource.matchCount} words</span>
              </div>
            </div>

            <div className="source-info-card">
              <h3>📄 {selectedSource.title}</h3>
              <a href={selectedSource.url} target="_blank" rel="noopener noreferrer" className="source-link">
                🔗 {selectedSource.url}
              </a>
              {selectedSource.matching_segments && selectedSource.matching_segments.length > 0 && (
                <div className="matching-segments">
                  <strong>🎯 Key Matching Phrases:</strong>
                  <div className="segments-list">
                    {selectedSource.matching_segments.slice(0, 5).map((segment, idx) => (
                      <span key={idx} className="segment-badge">"{segment}"</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="highlight-legend-box">
              <p><mark className="google-match-highlight">Green highlight</mark> shows text found on Google sources</p>
            </div>

            <div className="comparison-panels">
              <div className="comparison-panel">
                <h3>📝 Your Submission</h3>
                <div className="highlighted-content">
                  {selectedSource.currentHighlighted}
                </div>
              </div>

              <div className="comparison-divider">
                <div className="divider-line"></div>
                <div className="divider-icon">🌐</div>
                <div className="divider-line"></div>
              </div>

              <div className="comparison-panel">
                <h3>🌐 Google Source Snippet</h3>
                <div className="highlighted-content">
                  {selectedSource.sourceHighlighted}
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setSelectedSource(null)}>
              ← Back to Sources
            </button>
            <a 
              href={selectedSource.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Visit Source 🔗
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="google-viewer-overlay" onClick={onClose}>
      <div className="google-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🌐 Google Similarity Analysis</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-content">
          <div className="google-summary">
            <div className="summary-stat">
              <span className="stat-label">Overall Google Similarity:</span>
              <span 
                className="stat-value"
                style={{ color: getSimilarityColor(similarity) }}
              >
                {similarity}%
              </span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Sources Found:</span>
              <span className="stat-value">{googleSources.length}</span>
            </div>
            {allGoogleMatches && allGoogleMatches.length > 0 && (
              <div className="summary-stat">
                <span className="stat-label">Total Matches:</span>
                <span className="stat-value">{allGoogleMatches.length}</span>
              </div>
            )}
          </div>

          {googleHighlightedText && (
            <div className="highlighted-text-section">
              <h3>📝 Your Text with Google Matches Highlighted</h3>
              <div 
                className="google-highlighted-display"
                dangerouslySetInnerHTML={{ __html: googleHighlightedText }}
              />
            </div>
          )}

          <div className="sources-section">
            <h3>🌐 Matching Sources ({googleSources.length})</h3>
            <div className="sources-list">
              {googleSources.map((source, index) => (
                <div key={index} className="source-card">
                  <div className="source-header">
                    <span className="source-number">#{index + 1}</span>
                    <span 
                      className="source-similarity"
                      style={{ backgroundColor: getSimilarityColor(source.similarity) }}
                    >
                      {source.similarity}% Match
                    </span>
                  </div>
                  
                  <h4 className="source-title">📄 {source.title}</h4>
                  
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="source-url"
                  >
                    🔗 {source.url}
                  </a>
                  
                  <p className="source-snippet">{source.snippet}</p>
                  
                  {source.matching_segments && source.matching_segments.length > 0 && (
                    <div className="matching-segments-mini">
                      <strong>Matching phrases ({source.matching_segments.length}):</strong>
                      <div className="segments-preview">
                        {source.matching_segments.slice(0, 3).map((segment, idx) => (
                          <span key={idx} className="segment-mini">"{segment.substring(0, 50)}..."</span>
                        ))}
                        {source.matching_segments.length > 3 && (
                          <span className="more-segments">+{source.matching_segments.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <button 
                    className="btn-view-comparison"
                    onClick={() => handleViewSource(source)}
                  >
                    🔍 View Detailed Comparison
                  </button>
                </div>
              ))}
            </div>
          </div>

          {allGoogleMatches && allGoogleMatches.length > 0 && (
            <div className="all-matches-section">
              <h3>🎯 All Matching Phrases ({allGoogleMatches.length})</h3>
              <div className="matches-grid">
                {allGoogleMatches.map((match, idx) => (
                  <div key={idx} className="match-phrase">
                    <span className="match-number">{idx + 1}.</span>
                    <span className="match-text">"{match}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default GoogleSimilarityViewer;