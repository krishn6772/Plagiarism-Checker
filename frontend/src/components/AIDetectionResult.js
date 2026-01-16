import React, { useState } from 'react';
import './AIDetectionResult.css';

function AIDetectionResult({ aiResult }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!aiResult) {
    return null;
  }

  const getAIColor = (probability) => {
    if (probability >= 70) return '#dc3545';
    if (probability >= 50) return '#ffc107';
    if (probability >= 30) return '#17a2b8';
    return '#28a745';
  };

  const getConfidenceBadge = (confidence) => {
    const colors = {
      high: '#28a745',
      medium: '#ffc107',
      low: '#6c757d'
    };
    return colors[confidence] || '#6c757d';
  };

  return (
    <div className="ai-detection-container">
      <h4>🤖 AI Content Detection Results</h4>
      
      <div className="ai-score-display">
        <div className="ai-score-item">
          <div className="score-label">AI Probability</div>
          <div 
            className="score-circle"
            style={{ borderColor: getAIColor(aiResult.ai_probability) }}
          >
            <span 
              className="score-value"
              style={{ color: getAIColor(aiResult.ai_probability) }}
            >
              {aiResult.ai_probability}%
            </span>
          </div>
        </div>
        
        <div className="ai-score-item">
          <div className="score-label">Human Probability</div>
          <div 
            className="score-circle"
            style={{ borderColor: getAIColor(100 - aiResult.human_probability) }}
          >
            <span 
              className="score-value"
              style={{ color: getAIColor(100 - aiResult.human_probability) }}
            >
              {aiResult.human_probability}%
            </span>
          </div>
        </div>
        
        <div className="ai-confidence">
          <div className="score-label">Confidence Level</div>
          <span 
            className="confidence-badge"
            style={{ backgroundColor: getConfidenceBadge(aiResult.confidence) }}
          >
            {aiResult.confidence.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="ai-message">
        <strong>{aiResult.message}</strong>
      </div>

      {/* AI Indicators */}
      {aiResult.ai_indicators && aiResult.ai_indicators.length > 0 && (
        <div className="ai-indicators-section">
          <h5>⚠️ AI Writing Patterns Detected ({aiResult.ai_indicators.length})</h5>
          <div className="ai-patterns-list">
            {aiResult.ai_indicators.map((indicator, index) => (
              <div key={index} className="ai-pattern-item">
                <span className="pattern-phrase">"{indicator.phrase}"</span>
                <span className="pattern-context">Context: {indicator.context}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Analysis */}
      <div className="ai-details-toggle">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="btn-details"
        >
          {showDetails ? '▼ Hide' : '▶ Show'} Detailed Analysis
        </button>
      </div>

      {showDetails && (
        <div className="ai-detailed-analysis">
          <div className="analysis-grid">
            <div className="analysis-item">
              <span className="analysis-label">Perplexity Score:</span>
              <span className="analysis-value">{aiResult.analysis.perplexity_score}</span>
              <span className="analysis-desc">(Higher = More Human-like)</span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">Patterns Detected:</span>
              <span className="analysis-value">{aiResult.analysis.patterns_detected}</span>
              <span className="analysis-desc">(Common AI phrases)</span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">Uniformity Score:</span>
              <span className="analysis-value">{aiResult.analysis.uniformity_score}</span>
              <span className="analysis-desc">(Lower = More Natural)</span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">Avg Sentence Length:</span>
              <span className="analysis-value">{aiResult.analysis.avg_sentence_length} words</span>
              <span className="analysis-desc">(Typical: 15-25 words)</span>
            </div>
          </div>
        </div>
      )}

      {/* Highlighted Text */}
      {aiResult.highlighted_text && aiResult.ai_indicators.length > 0 && (
        <div className="ai-highlighted-section">
          <h5>📄 Text with AI Patterns Highlighted:</h5>
          <p className="highlight-legend-ai">
            <mark className="ai-pattern">Pink highlights</mark> show AI writing patterns
          </p>
          <div 
            className="ai-highlighted-text"
            dangerouslySetInnerHTML={{ __html: aiResult.highlighted_text }}
          />
        </div>
      )}
    </div>
  );
}

export default AIDetectionResult;