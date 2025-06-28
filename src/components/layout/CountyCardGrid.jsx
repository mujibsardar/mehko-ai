import React, { useEffect, useState } from "react";
import CountyCard from "../shared/CountyCard";

import "./CountyCardGrid.scss";

const CountyCardGrid = ({ onCountySelect }) => {
  const [counties, setCounties] = useState([]);

  useEffect(() => {
    const fetchCounties = async () => {
      try {
        const response = await fetch("/data/counties.json");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setCounties(data);
      } catch (error) {
        console.error("Error fetching counties:", error);
      }
    };
    fetchCounties();
  }, []);

  return (
    <div className="county-card-grid">
      <h2 className="grid-title">Select Your Application</h2>
      <div className="card-grid">
        {counties.map((county) => (
          <CountyCard
            key={county.id}
            county={county}
            onClick={() => onCountySelect(county)}
          />
        ))}
      </div>
    </div>
  );
};

export default CountyCardGrid;
