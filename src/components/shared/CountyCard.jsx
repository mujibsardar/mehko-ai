import React from "react";
import "./CountyCard.scss";

const CountyCard = ({ county, onClick }) => {
  return (
    <div className="county-card" onClick={onClick}>
      <div className="county-card-inner">
        <h3>{county.name}</h3>
        <p>Click to view application steps</p>
      </div>
    </div>
  );
};

export default CountyCard;
