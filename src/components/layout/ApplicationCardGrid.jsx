import { useEffect, useState } from "react";
import ApplicationCard from "../shared/ApplicationCard";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase"; // ✅ Your configured Firebase instance

import "./ApplicationCardGrid.scss";

const ApplicationCardGrid = ({ onApplicationSelect }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const snapshot = await getDocs(collection(db, "applications"));
        const result = {};
        snapshot.forEach((doc) => {
          result[doc.id] = doc.data();
        });
        console.log(" ");
        console.log(" ");
        console.log(" ");
        console.log("Fetched applications:", JSON.stringify(result, null, 2));
        setApplications(result);
      } catch (err) {
        console.error("Failed to fetch applications:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchApplications();
  }, []);

  return (
    <div className="application-card-grid">
      <h2 className="grid-title">Select Your Application</h2>
      <div className="card-grid">
        {loading && <p>Loading applications...</p>}
        {!loading && applications.length === 0 && (
          <p>No applications available at this time.</p>
        )}
        {!loading &&
          Object.values(applications).map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onClick={() => onApplicationSelect(application)}
            />
          ))}
      </div>
    </div>
  );
};

export default ApplicationCardGrid;
