import React, { useState } from 'react';
import './GoogleSources.css';

function GoogleSources({ sources, similarity, allMatches, title }) {
  const [expandedSource, setExpandedSource] = useState(null);

  if (!sources || sources.length === 0) {
    return null;
  }

  const getSimilarityColor = (score) => {
    if (score >= 80) return '#dc3545';
    if (score >= 50) return '#ffc107';
    return '#28a745';
  };

  const toggleSource = (index) => {
    setExpandedSource(expandedSource === index ? null : index);
  };

  return (
    <div className="google-sources-container">
      <h4>{title || `🔍 Google Sources (${sources.length} found)`}</h4>
      <p className="sources-intro">
        Similar content found on the following websites (Similarity: 
        <span style={{ color: getSimilarityColor(similarity), fontWeight: 'bold', marginLeft: '5px' }}>
          {similarity}%
        </span>)
      </p>
      
      {/* Show all matching segments */}
      {allMatches && allMatches.length > 0 && (
        <div className="all-matches-section">
          <h5>🔍 Matching Text Segments Found Online:</h5>
          <div className="matches-list-chips">
            {allMatches.map((match, index) => (
              <div key={index} className="match-chip">
                "{match}"
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="sources-list">
        {sources.map((source, index) => (
          <div key={index} className="source-card">
            <div className="source-header" onClick={() => toggleSource(index)}>
              <div className="source-title-section">
                <span className="source-number">#{index + 1}</span>
                <h5 className="source-title">{source.title}</h5>
              </div>
              <div className="source-meta">
                <span 
                  className="source-similarity"
                  style={{ backgroundColor: getSimilarityColor(source.similarity) }}
                >
                  {source.similarity}%
                </span>
                <button className="expand-btn">
                  {expandedSource === index ? '∧' : '+'}
                </button>
              </div>
            </div>
            
            {expandedSource === index && (
              <div className="source-content">
                <div className="source-url">
                  <strong>🔗 URL:</strong>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.url}
                  </a>
                </div>
                
                {/* Show matching segments for this source */}
                {source.matching_segments && source.matching_segments.length > 0 && (
                  <div className="source-matches">
                    <strong>✨ Matching Segments from this Source:</strong>
                    <div className="source-matches-list">
                      {source.matching_segments.map((segment, idx) => (
                        <div key={idx} className="source-match-item">
                          <span className="match-icon">•</span>
                          <span className="match-text">"{segment}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="source-snippet">
                  <strong>📄 Excerpt:</strong>
                  <p>{source.snippet}</p>
                </div>
                
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="visit-source-btn"
                >
                  Visit Source →
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GoogleSources;