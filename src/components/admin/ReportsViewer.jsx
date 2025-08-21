import React, { useState, useEffect } from "react";
import { getReports, updateReportStatus, deleteReport, getReportStats } from "../../firebase/reports";
import "./ReportsViewer.scss";

export default function ReportsViewer() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadReports();
    loadStats();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const fetchedReports = await getReports();
      setReports(fetchedReports);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const reportStats = await getReportStats();
      setStats(reportStats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleStatusUpdate = async (reportId, newStatus) => {
    try {
      await updateReportStatus(reportId, newStatus);
      await loadReports(); // Refresh the list
      await loadStats(); // Refresh stats
    } catch (error) {
      console.error("Failed to update report status:", error);
      alert("Failed to update report status");
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report? This cannot be undone.")) {
      return;
    }
    
    try {
      await deleteReport(reportId);
      await loadReports(); // Refresh the list
      await loadStats(); // Refresh stats
    } catch (error) {
      console.error("Failed to delete report:", error);
      alert("Failed to delete report");
    }
  };

  const filteredReports = reports.filter(report => {
    if (filter !== "all" && report.context !== filter) return false;
    if (statusFilter !== "all" && report.status !== statusFilter) return false;
    return true;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "#dc2626";
      case "high": return "#ea580c";
      case "medium": return "#d97706";
      case "low": return "#059669";
      default: return "#6b7280";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open": return "#3b82f6";
      case "in-progress": return "#f59e0b";
      case "resolved": return "#10b981";
      case "closed": return "#6b7280";
      default: return "#6b7280";
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="reports-viewer">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="reports-viewer">
        <div className="no-reports">
          <h3>No Reports Yet</h3>
          <p>When users submit issue reports, they will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-viewer">
      <div className="reports-header">
        <h2>Issue Reports ({reports.length})</h2>
        <div className="header-actions">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Contexts</option>
            <option value="application">Application Issues</option>
            <option value="step">Step Issues</option>
          </select>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button onClick={loadReports} className="refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Reports</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.byStatus.open || 0}</div>
            <div className="stat-label">Open</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.byStatus["in-progress"] || 0}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.byStatus.resolved || 0}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>
      )}

      <div className="reports-list">
        {filteredReports.map((report) => (
          <div key={report.id} className="report-card">
            <div className="report-header">
              <div className="report-meta">
                <span 
                  className="severity-badge"
                  style={{ backgroundColor: getSeverityColor(report.severity) }}
                >
                  {report.severity}
                </span>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(report.status) }}
                >
                  {report.status}
                </span>
                <span className="context-badge">
                  {report.context === "application" ? "Application" : "Step"}
                </span>
                <span className="issue-type">
                  {report.issueType}
                </span>
              </div>
              <span className="timestamp">{formatDate(report.createdAt)}</span>
            </div>

            <div className="report-content">
              <h4 className="report-title">
                {report.applicationTitle}
                {report.stepTitle && (
                  <span className="step-title"> → {report.stepTitle}</span>
                )}
              </h4>
              <p className="description">{report.description}</p>
            </div>

            <div className="report-details">
              <div className="detail-item">
                <strong>Application:</strong> {report.applicationTitle}
              </div>
              {report.stepTitle && (
                <div className="detail-item">
                  <strong>Step:</strong> {report.stepTitle}
                </div>
              )}
              <div className="detail-item">
                <strong>Issue Type:</strong> {report.issueType}
              </div>
              <div className="detail-item">
                <strong>Severity:</strong> {report.severity}
              </div>
              <div className="detail-item">
                <strong>Reported by:</strong> {report.userEmail}
              </div>
              <div className="detail-item">
                <strong>Status:</strong> {report.status}
              </div>
            </div>

            <div className="report-actions">
              <select
                value={report.status}
                onChange={(e) => handleStatusUpdate(report.id, e.target.value)}
                className="status-select"
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <button
                onClick={() => handleDeleteReport(report.id)}
                className="delete-btn"
                title="Delete report"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
