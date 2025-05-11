import React from "react";
import CommunityComments from "./CommentsSection";
import "./CountyView.scss";

const CountyView = ({ county }) => {
  return (
    <>
      <div className="county-view">
        <h2>{county.name}</h2>

        <div className="county-section">
          <h3>Application Process</h3>
          <p>
            We'll walk you through submitting a MEHKO application in{" "}
            {county.name}.
          </p>
        </div>

        <div className="county-section">
          <h3>Permit Requirements</h3>
          <p>Details on inspections, food safety, zoning, and more.</p>
        </div>

        <div className="county-section">
          <h3>Forms & PDFs</h3>
          <p>Download or complete relevant application forms.</p>
        </div>

        <div className="county-section">
          <h3>Ask AI</h3>
          <p>Use our assistant to ask questions about the MEHKO process.</p>
        </div>

        <div className="county-section">
          <h3>Community Comments</h3>
          <p>See what others are saying about applying in this county.</p>
        </div>
      </div>
      <CommunityComments county={county} />
    </>
  );
};

export default CountyView;
