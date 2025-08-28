import React from 'react';
import './Legal.scss';

const CookiePolicy = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Cookie Policy</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>1. What Are Cookies</h2>
          <p>
            Cookies are small text files that are placed on your device when you visit our website. 
            They help us provide you with a better experience and allow certain features to work properly.
          </p>
        </section>

        <section>
          <h2>2. How We Use Cookies</h2>
          
          <h3>2.1 Essential Cookies</h3>
          <ul>
            <li><strong>Authentication:</strong> Required for secure login and session management</li>
            <li><strong>Functionality:</strong> Enable core application features to work</li>
            <li><strong>Security:</strong> Help protect against fraud and unauthorized access</li>
          </ul>

          <h3>2.2 Performance Cookies</h3>
          <ul>
            <li><strong>Analytics:</strong> Help us understand how our service is used</li>
            <li><strong>Optimization:</strong> Identify areas for improvement</li>
            <li><strong>User Experience:</strong> Remember your preferences and settings</li>
          </ul>
        </section>

        <section>
          <h2>3. Managing Cookies</h2>
          
          <h3>3.1 Browser Settings</h3>
          <p>
            You can control and manage cookies through your browser settings. Most browsers allow you to:
          </p>
          <ul>
            <li>View which cookies are stored on your device</li>
            <li>Delete cookies individually or all at once</li>
            <li>Block cookies from specific websites</li>
            <li>Set preferences for future cookies</li>
          </ul>

          <h3>3.2 Opting Out</h3>
          <p>
            You can opt out of non-essential cookies by adjusting your browser settings. 
            However, this may affect the functionality of our service.
          </p>
        </section>

        <section>
          <h2>4. Third-Party Cookies</h2>
          
          <h3>4.1 Service Providers</h3>
          <ul>
            <li><strong>Firebase:</strong> Authentication and analytics services</li>
            <li><strong>OpenAI:</strong> AI processing and improvement</li>
            <li><strong>Analytics:</strong> Usage tracking and optimization</li>
          </ul>

          <h3>4.2 Third-Party Policies</h3>
          <p>
            Third-party services have their own cookie policies. We recommend reviewing their 
            policies for complete information about how they use cookies.
          </p>
        </section>

        <section>
          <h2>5. Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time. Any changes will be posted on this page 
            with an updated "Last Updated" date. We encourage you to review this policy periodically.
          </p>
        </section>

        <section>
          <h2>6. Contact Information</h2>
          <p>
            If you have questions about our use of cookies, please contact us:
          </p>
          <ul>
            <li><strong>Email:</strong> privacy@mehko-ai.com</li>
            <li><strong>Subject:</strong> Cookie Policy Questions</li>
          </ul>
        </section>

        <div className="legal-note">
          <p>
            <strong>Note:</strong> This Cookie Policy is a template and should be reviewed by legal counsel 
            to ensure compliance with applicable laws and regulations in your jurisdiction.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
