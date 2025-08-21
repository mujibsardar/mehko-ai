import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";

const REPORTS_COLLECTION = "reports";

/**
 * Submit a new issue report to Firestore
 * @param {Object} reportData - The report data to store
 * @param {string} reportData.applicationId - Application ID
 * @param {string} reportData.applicationTitle - Application title
 * @param {string} reportData.stepId - Step ID (optional)
 * @param {string} reportData.stepTitle - Step title (optional)
 * @param {string} reportData.issueType - Type of issue
 * @param {string} reportData.description - Issue description
 * @param {string} reportData.severity - Issue severity
 * @param {string} reportData.context - "application" or "step"
 * @param {string} reportData.userId - User ID who submitted the report
 * @param {string} reportData.userEmail - User email
 * @returns {Promise<string>} Document ID of the created report
 */
export async function submitReport(reportData) {
  try {
    const reportWithMetadata = {
      ...reportData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "open", // open, in-progress, resolved, closed
      assignedTo: null,
      resolution: null,
      resolvedAt: null
    };

    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), reportWithMetadata);
    return docRef.id;
  } catch (error) {
    console.error("Error submitting report:", error);
    throw new Error("Failed to submit report");
  }
}

/**
 * Get all reports with optional filtering
 * @param {Object} filters - Optional filters
 * @param {string} filters.status - Filter by status
 * @param {string} filters.context - Filter by context (application/step)
 * @param {string} filters.severity - Filter by severity
 * @param {string} filters.applicationId - Filter by specific application
 * @returns {Promise<Array>} Array of report documents
 */
export async function getReports(filters = {}) {
  try {
    let q = collection(db, REPORTS_COLLECTION);
    
    // Apply filters
    if (filters.status) {
      q = query(q, where("status", "==", filters.status));
    }
    if (filters.context) {
      q = query(q, where("context", "==", filters.context));
    }
    if (filters.severity) {
      q = query(q, where("severity", "==", filters.severity));
    }
    if (filters.applicationId) {
      q = query(q, where("applicationId", "==", filters.applicationId));
    }
    
    // Always order by creation date (newest first)
    q = query(q, orderBy("createdAt", "desc"));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw new Error("Failed to fetch reports");
  }
}

/**
 * Get reports for a specific application
 * @param {string} applicationId - Application ID
 * @returns {Promise<Array>} Array of report documents for the application
 */
export async function getReportsByApplication(applicationId) {
  return getReports({ applicationId });
}

/**
 * Update report status
 * @param {string} reportId - Report document ID
 * @param {string} status - New status
 * @param {string} assignedTo - User assigned to the report
 * @param {string} resolution - Resolution notes
 * @returns {Promise<void>}
 */
export async function updateReportStatus(reportId, status, assignedTo = null, resolution = null) {
  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    const updateData = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (resolution) updateData.resolution = resolution;
    if (status === "resolved" || status === "closed") {
      updateData.resolvedAt = new Date().toISOString();
    }
    
    await updateDoc(reportRef, updateData);
  } catch (error) {
    console.error("Error updating report status:", error);
    throw new Error("Failed to update report status");
  }
}

/**
 * Delete a report
 * @param {string} reportId - Report document ID
 * @returns {Promise<void>}
 */
export async function deleteReport(reportId) {
  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    await deleteDoc(reportRef);
  } catch (error) {
    console.error("Error deleting report:", error);
    throw new Error("Failed to delete report");
  }
}

/**
 * Get report statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getReportStats() {
  try {
    const allReports = await getReports();
    
    const stats = {
      total: allReports.length,
      byStatus: {},
      byContext: {},
      bySeverity: {},
      byApplication: {}
    };
    
    allReports.forEach(report => {
      // Count by status
      stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;
      
      // Count by context
      stats.byContext[report.context] = (stats.byContext[report.context] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[report.severity] = (stats.bySeverity[report.severity] || 0) + 1;
      
      // Count by application
      stats.byApplication[report.applicationId] = (stats.byApplication[report.applicationId] || 0) + 1;
    });
    
    return stats;
  } catch (error) {
    console.error("Error fetching report stats:", error);
    throw new Error("Failed to fetch report statistics");
  }
}
