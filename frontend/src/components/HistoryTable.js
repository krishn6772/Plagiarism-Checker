import React, { useState } from 'react';
import './HistoryTable.css';

function HistoryTable({ history, onDelete, showUserId = false }) {
  const [expandedRow, setExpandedRow] = useState(null);

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const getSimilarityColor = (score) => {
    if (score >= 80) return '#dc3545';
    if (score >= 50) return '#ffc107';
    return '#28a745';
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (history.length === 0) {
    return (
      <div className="empty-state">
        <p>📋 No history records found</p>
      </div>
    );
  }

  return (
    <div className="history-table-container">
      <table className="data-table history-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            {showUserId && <th>User ID</th>}
            <th>Text Preview</th>
            <th>Similarity</th>
            <th>Google Check</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {history.map((record) => (
            <React.Fragment key={record.id}>
              <tr>
                <td>{new Date(record.timestamp).toLocaleString()}</td>
                {showUserId && <td className="text-monospace">{record.user_id.substring(0, 8)}...</td>}
                <td>
                  <div className="text-preview">
                    <strong>Text 1:</strong> {truncateText(record.text1)}
                    <br />
                    <strong>Text 2:</strong> {truncateText(record.text2)}
                  </div>
                  <button onClick={() => toggleRow(record.id)} className="btn-link">
                    {expandedRow === record.id ? 'Show Less' : 'Show More'}
                  </button>
                </td>
                <td>
                  <span
                    className="similarity-badge"
                    style={{
                      backgroundColor: getSimilarityColor(record.similarity_score),
                      color: 'white',
                    }}
                  >
                    {record.similarity_score}%
                  </span>
                </td>
                <td>
                  {record.google_similarity !== null ? (
                    <span
                      className="similarity-badge"
                      style={{
                        backgroundColor: getSimilarityColor(record.google_similarity),
                        color: 'white',
                      }}
                    >
                      {record.google_similarity}%
                    </span>
                  ) : (
                    <span className="text-muted">N/A</span>
                  )}
                </td>
                <td>
                  <button onClick={() => onDelete(record.id)} className="btn-sm btn-danger">
                    Delete
                  </button>
                </td>
              </tr>
              {expandedRow === record.id && (
                <tr className="expanded-row">
                  <td colSpan={showUserId ? 6 : 5}>
                    <div className="expanded-content">
                      <div className="text-full">
                        <div className="text-section">
                          <h4>Text 1 (Full):</h4>
                          <pre>{record.text1}</pre>
                        </div>
                        <div className="text-section">
                          <h4>Text 2 (Full):</h4>
                          <pre>{record.text2}</pre>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HistoryTable;