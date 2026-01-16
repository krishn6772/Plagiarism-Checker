import React from 'react';
import './HistoryMatches.css';

function HistoryMatches({ matches, onClose }) {
  const getSimilarityColor = (score) => {
    if (score >= 80) return '#dc3545';
    if (score >= 50) return '#ffc107';
    return '#28a745';
  };

  if (!matches || matches.length === 0) {
    return null;
  }

  return (
    <div className="history-matches-overlay" onClick={onClose}>
      <div className="history-matches-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚠️ Similar Content Found in History</h2>
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
                
                {match.file_name && (
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
                  <div className="match-text-section">
                    <strong>Original Text 2:</strong>
                    <p>{match.original_text2}</p>
                  </div>
                </div>
                
                <div className="matched-content">
                  <strong>🔍 Matched Content:</strong>
                  <div className="matched-text">
                    {match.matched_text}
                  </div>
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