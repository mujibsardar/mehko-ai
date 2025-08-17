import React from "react";

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="hero">
        <h1>Welcome to mehko.ai</h1>
        <p>AI-powered application assistance made simple.</p>
      </section>

      {/* Cards */}
      <section className="features">
        <div className="feature-card">
          <h2>Step 1</h2>
          <p>Choose your application.</p>
        </div>
        <div className="feature-card">
          <h2>Step 2</h2>
          <p>Fill forms with AI guidance.</p>
        </div>
        <div className="feature-card">
          <h2>Step 3</h2>
          <p>Download and submit confidently.</p>
        </div>
      </section>
    </div>
  );
}
