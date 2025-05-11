import React, { useEffect, useState } from "react";
import CountyCard from "../shared/CountyCard";
import countiesData from "../../data/counties.json";

import "./CountyCardGrid.scss";

const CountyCardGrid = ({ onCountySelect }) => {
  const [counties, setCounties] = useState([]);

  useEffect(() => {
    // Load from local JSON for now
    setCounties(countiesData);
  }, []);

  return (
    <div className="county-card-grid">
      <h2 className="grid-title">Select Your County</h2>
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
