import React, { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import CountyCardGrid from "./components/layout/CountyCardGrid";
import CountyView from "./components/county/CountyView";
import Header from "./components/layout/Header";

import "./styles/app.scss";

function App() {
  console.log("App loaded");
  const [selectedCounties, setSelectedCounties] = useState([]);
  const [activeCountyId, setActiveCountyId] = useState(null);

  const handleCountySelect = (county) => {
    const alreadyAdded = selectedCounties.find((c) => c.id === county.id);
    if (!alreadyAdded) {
      setSelectedCounties([...selectedCounties, county]);
    }
    setActiveCountyId(county.id);
  };

  const handleCountySwitch = (countyId) => {
    setActiveCountyId(countyId);
  };

  const handleCountyRemove = (countyId) => {
    const updated = selectedCounties.filter((c) => c.id !== countyId);
    setSelectedCounties(updated);
    if (activeCountyId === countyId) {
      setActiveCountyId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const activeCounty = selectedCounties.find((c) => c.id === activeCountyId);

  return (
    <>
      <Header />
      <div className="app-wrapper">
        <Sidebar
          counties={selectedCounties}
          activeCountyId={activeCountyId}
          onSelect={handleCountySwitch}
          onRemove={handleCountyRemove}
        />
        <main className="main-content">
          {activeCounty ? (
            <CountyView county={activeCounty} />
          ) : (
            <CountyCardGrid onCountySelect={handleCountySelect} />
          )}
        </main>
      </div>
    </>
  );
}

export default App;
