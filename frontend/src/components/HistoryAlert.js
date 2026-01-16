import React from 'react';
import './HistoryAlert.css';

function HistoryAlert({ matches, onViewDetails }) {
  if (!matches || matches.matches_found === 0) {
    return null;
  }

  const getSimilarityColor = (score) => {
    if (score >= 80) return '#dc3545';
    if (score >= 50) return '#ffc107';
    return '#17a2b8';
  };

  return (
    <div className="history-alert-container">
      <div className="history-alert-icon">⚠️</div>
      <div className="history-alert-content">
        <h4>Similar Content Found in Your History!</h4>
        <p>
          We found <strong>{matches.matches_found}</strong> previous submission(s) with similar content.
          Highest similarity: <span 
            style={{ 
              color: getSimilarityColor(matches.highest_similarity),
              fontWeight: 'bold',
              fontSize: '18px'
            }}
          >
            {matches.highest_similarity}%
          </span>
        </p>
        <div className="history-matches-preview">
          {matches.matches.slice(0, 2).map((match, index) => (
            <div key={index} className="match-preview-item">
              <div className="match-preview-header">
                <span className="match-date">
                  📅 {new Date(match.timestamp).toLocaleDateString()}
                </span>
                <span 
                  className="match-score"
                  style={{ backgroundColor: getSimilarityColor(match.similarity_score) }}
                >
                  {match.similarity_score}%
                </span>
              </div>
              <div className="match-preview-text">
                "{match.matched_text}"
              </div>
            </div>
          ))}
          {matches.matches_found > 2 && (
            <p className="more-matches">
              and {matches.matches_found - 2} more match(es)...
            </p>
          )}
        </div>
        <button onClick={onViewDetails} className="btn-view-history">
          View All Matches
        </button>
      </div>
    </div>
  );
}

export default HistoryAlert;