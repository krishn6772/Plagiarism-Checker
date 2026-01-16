import React, { useState, useEffect } from 'react';
import {
  getAllUsers,
  deleteUser,
  toggleAdminStatus,
  getStats,
  getAllHistory,
  deleteHistory,
} from '../api/api';
import HistoryTable from '../components/HistoryTable';
import './Dashboard.css';

function AdminDashboard({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getAllUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await getAllHistory();
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId);
        fetchUsers();
        fetchStats();
        alert('User deleted successfully');
      } catch (error) {
        alert('Error deleting user: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      await toggleAdminStatus(userId);
      fetchUsers();
      fetchStats();
      alert('Admin status updated successfully');
    } catch (error) {
      alert('Error updating admin status: ' + (error.response?.data?.detail || error.message));
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

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h1>Admin Dashboard</h1>
        <div className="nav-right">
          <span className="user-info">Welcome, {user.username} (Admin)</span>
          <button onClick={onLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        {stats && (
          <div className="stats-container">
            <div className="stat-card">
              <h3>Total Users</h3>
              <p className="stat-value">{stats.total_users}</p>
            </div>
            <div className="stat-card">
              <h3>Regular Users</h3>
              <p className="stat-value">{stats.regular_users}</p>
            </div>
            <div className="stat-card">
              <h3>Admins</h3>
              <p className="stat-value">{stats.total_admins}</p>
            </div>
            <div className="stat-card">
              <h3>Total Checks</h3>
              <p className="stat-value">{stats.total_plagiarism_checks}</p>
            </div>
          </div>
        )}

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Manage Users
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            All History
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="tab-content">
            <h2>User Management</h2>
            {loading ? (
              <p>Loading users...</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${u.is_admin ? 'badge-admin' : 'badge-user'}`}>
                            {u.is_admin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            {u.id !== user.id && (
                              <>
                                <button
                                  onClick={() => handleToggleAdmin(u.id)}
                                  className="btn-sm btn-warning"
                                >
                                  {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="btn-sm btn-danger"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                            {u.id === user.id && (
                              <span className="text-muted">You</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="tab-content">
            <h2>All Plagiarism Check History</h2>
            {loading ? (
              <p>Loading history...</p>
            ) : (
              <HistoryTable history={history} onDelete={handleDeleteHistory} showUserId />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;