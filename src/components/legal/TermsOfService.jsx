import React from 'react';
import './Legal.scss';

const TermsOfService = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Terms of Service</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the MEHKO AI application ("Service"), you agree to be bound by these 
            Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          
          <h3>2.1 What We Provide</h3>
          <p>
            MEHKO AI is an AI-powered application that helps users complete and submit government permit 
            applications, particularly for MEHKO (Mobile Food Facility) permits.
          </p>

          <h3>2.2 Service Features</h3>
          <ul>
            <li><strong>AI-Powered Assistance:</strong> Help with form completion and document processing</li>
            <li><strong>Application Management:</strong> Track and manage permit applications</li>
            <li><strong>Document Storage:</strong> Secure storage of application materials</li>
            <li><strong>Progress Tracking:</strong> Monitor application completion status</li>
          </ul>

          <h3>2.3 Service Limitations</h3>
          <ul>
            <li><strong>Not Legal Advice:</strong> We do not provide legal, tax, or professional advice</li>
            <li><strong>Government Requirements:</strong> We cannot guarantee approval of applications</li>
            <li><strong>Service Availability:</strong> Service may be temporarily unavailable for maintenance</li>
          </ul>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          
          <h3>3.1 Account Creation</h3>
          <ul>
            <li><strong>Registration Required:</strong> You must create an account to use our Service</li>
            <li><strong>Accurate Information:</strong> Provide accurate and complete information</li>
            <li><strong>Account Security:</strong> Maintain the security of your login credentials</li>
            <li><strong>Age Requirement:</strong> Must be at least 18 years old or have parental consent</li>
          </ul>

          <h3>3.2 Account Responsibilities</h3>
          <ul>
            <li><strong>Sole Access:</strong> You are responsible for all activity under your account</li>
            <li><strong>Unauthorized Use:</strong> Notify us immediately of any unauthorized access</li>
            <li><strong>Account Transfer:</strong> Accounts are personal and non-transferable</li>
          </ul>
        </section>

        <section>
          <h2>4. Acceptable Use</h2>
          
          <h3>4.1 Permitted Uses</h3>
          <ul>
            <li><strong>Personal Use:</strong> Complete your own permit applications</li>
            <li><strong>Business Use:</strong> Complete applications for your business</li>
            <li><strong>Authorized Access:</strong> Access only your own data and applications</li>
          </ul>

          <h3>4.2 Prohibited Uses</h3>
          <ul>
            <li><strong>Illegal Activities:</strong> Any unlawful or fraudulent activities</li>
            <li><strong>Unauthorized Access:</strong> Attempting to access others' accounts or data</li>
            <li><strong>Service Interference:</strong> Disrupting or interfering with our Service</li>
            <li><strong>Data Misuse:</strong> Using our Service to collect or process data improperly</li>
          </ul>
        </section>

        <section>
          <h2>5. User Content and Data</h2>
          
          <h3>5.1 Your Content</h3>
          <ul>
            <li><strong>Ownership:</strong> You retain ownership of your content</li>
            <li><strong>License:</strong> Grant us license to use content to provide our Service</li>
            <li><strong>Responsibility:</strong> You are responsible for the content you submit</li>
            <li><strong>Accuracy:</strong> Ensure all submitted information is accurate and complete</li>
          </ul>

          <h3>5.2 Data Processing</h3>
          <ul>
            <li><strong>AI Processing:</strong> Your data may be processed by AI systems for service improvement</li>
            <li><strong>Data Security:</strong> We implement appropriate security measures</li>
            <li><strong>Data Retention:</strong> Data retained according to our Privacy Policy</li>
          </ul>
        </section>

        <section>
          <h2>6. Privacy and Data Protection</h2>
          
          <h3>6.1 Privacy Policy</h3>
          <ul>
            <li><strong>Comprehensive Coverage:</strong> Our Privacy Policy explains data practices</li>
            <li><strong>Consent:</strong> By using our Service, you consent to our data practices</li>
            <li><strong>Updates:</strong> Privacy Policy may be updated as described therein</li>
          </ul>

          <h3>6.2 Data Security</h3>
          <ul>
            <li><strong>Industry Standards:</strong> We follow industry-standard security practices</li>
            <li><strong>Encryption:</strong> Data encrypted in transit and at rest</li>
            <li><strong>Access Controls:</strong> Strict access controls and authentication</li>
          </ul>
        </section>

        <section>
          <h2>7. Service Availability and Modifications</h2>
          
          <h3>7.1 Service Availability</h3>
          <ul>
            <li><strong>Best Efforts:</strong> We strive to maintain high service availability</li>
            <li><strong>Maintenance:</strong> Scheduled maintenance may cause temporary outages</li>
            <li><strong>Force Majeure:</strong> Service may be affected by events beyond our control</li>
          </ul>

          <h3>7.2 Service Modifications</h3>
          <ul>
            <li><strong>Continuous Improvement:</strong> We may modify or discontinue features</li>
            <li><strong>Notice:</strong> Significant changes will be communicated to users</li>
            <li><strong>Acceptance:</strong> Continued use constitutes acceptance of changes</li>
          </ul>
        </section>

        <section>
          <h2>8. Disclaimers and Limitations</h2>
          
          <h3>8.1 Service Disclaimers</h3>
          <ul>
            <li><strong>"As Is":</strong> Service provided "as is" without warranties</li>
            <li><strong>No Guarantees:</strong> We cannot guarantee application approval</li>
            <li><strong>Third-Party Services:</strong> We are not responsible for third-party services</li>
          </ul>

          <h3>8.2 Limitation of Liability</h3>
          <ul>
            <li><strong>Maximum Liability:</strong> Our liability limited to amounts paid for service</li>
            <li><strong>Excluded Damages:</strong> We are not liable for indirect or consequential damages</li>
            <li><strong>Essential Purpose:</strong> Limitations apply to the fullest extent permitted by law</li>
          </ul>
        </section>

        <section>
          <h2>9. Contact Information</h2>
          
          <h3>9.1 General Inquiries</h3>
          <ul>
            <li><strong>Email:</strong> support@mehko-ai.com</li>
            <li><strong>Address:</strong> [Your Business Address]</li>
            <li><strong>Phone:</strong> [Your Phone Number]</li>
          </ul>

          <h3>9.2 Legal Matters</h3>
          <ul>
            <li><strong>Email:</strong> legal@mehko-ai.com</li>
          </ul>
        </section>

        <div className="legal-note">
          <p>
            <strong>Note:</strong> These Terms of Service are a template and should be reviewed by legal counsel 
            to ensure compliance with applicable laws and regulations in your jurisdiction.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
