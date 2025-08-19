import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import useAuth from "../../hooks/useAuth";

import "./ApplicationCardGrid.scss";

const ApplicationCardGrid = ({ onApplicationSelect }) => {
  const [applications, setApplications] = useState([]);
  const [_progressByAppId, _setProgressByAppId] = useState({});
  const [loading, setLoading] = useState(true);
  const { _user } = useAuth();

  useEffect(() => {
    async function fetchApplications() {
      try {
        const snapshot = await getDocs(collection(db, "applications"));
        const result = {};
        snapshot.forEach((doc) => {
          result[doc.id] = { id: doc.id, ...doc.data() };
        });
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
        {!loading && Object.keys(applications).length === 0 && (
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
