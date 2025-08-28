import React from 'react';
import './Legal.scss';

const PrivacyPolicy = () => {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <h1>Privacy Policy</h1>
                <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>

                <section>
                    <h2>1. Introduction</h2>
                    <p>
                        Welcome to MEHKO AI ("we," "our," or "us"). We are committed to protecting your privacy
                        and ensuring the security of your personal information. This Privacy Policy explains how we
                        collect, use, disclose, and safeguard your information when you use our MEHKO AI application.
                    </p>
                </section>

                <section>
                    <h2>2. Information We Collect</h2>

                    <h3>2.1 Personal Information</h3>
                    <ul>
                        <li><strong>Account Information:</strong> Name, email address, and authentication details</li>
                        <li><strong>Profile Information:</strong> User preferences and settings</li>
                        <li><strong>Communication Data:</strong> Messages and feedback you send to us</li>
                    </ul>

                    <h3>2.2 Application Data</h3>
                    <ul>
                        <li><strong>Form Data:</strong> Information you enter into permit applications</li>
                        <li><strong>Document Uploads:</strong> PDFs and other files you upload</li>
                        <li><strong>Progress Tracking:</strong> Your application completion status and progress</li>
                    </ul>

                    <h3>2.3 Technical Information</h3>
                    <ul>
                        <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
                        <li><strong>Usage Data:</strong> How you interact with our application</li>
                        <li><strong>Log Data:</strong> Server logs, IP addresses, and access timestamps</li>
                    </ul>
                </section>

                <section>
                    <h2>3. How We Use Your Information</h2>

                    <h3>3.1 Primary Purposes</h3>
                    <ul>
                        <li><strong>Service Delivery:</strong> Provide and maintain the MEHKO AI application</li>
                        <li><strong>User Support:</strong> Respond to your questions and provide assistance</li>
                        <li><strong>Application Processing:</strong> Help you complete and submit permit applications</li>
                        <li><strong>Improvement:</strong> Enhance our services and user experience</li>
                    </ul>

                    <h3>3.2 Secondary Purposes</h3>
                    <ul>
                        <li><strong>Analytics:</strong> Understand usage patterns and optimize performance</li>
                        <li><strong>Security:</strong> Protect against fraud and unauthorized access</li>
                        <li><strong>Compliance:</strong> Meet legal and regulatory requirements</li>
                    </ul>
                </section>

                <section>
                    <h2>4. Information Sharing and Disclosure</h2>

                    <h3>4.1 We Do Not Sell Your Data</h3>
                    <p>We do not sell, rent, or trade your personal information to third parties.</p>

                    <h3>4.2 Limited Sharing</h3>
                    <p>We may share your information only in these circumstances:</p>
                    <ul>
                        <li><strong>With Your Consent:</strong> When you explicitly authorize sharing</li>
                        <li><strong>Service Providers:</strong> With trusted partners who help us operate our service</li>
                        <li><strong>Legal Requirements:</strong> When required by law or to protect rights</li>
                        <li><strong>Business Transfers:</strong> In connection with a merger or acquisition</li>
                    </ul>
                </section>

                <section>
                    <h2>5. Data Security</h2>

                    <h3>5.1 Security Measures</h3>
                    <ul>
                        <li><strong>Encryption:</strong> Data is encrypted in transit and at rest</li>
                        <li><strong>Access Controls:</strong> Strict access controls and authentication</li>
                        <li><strong>Regular Audits:</strong> Security assessments and monitoring</li>
                        <li><strong>Employee Training:</strong> Staff trained on data protection</li>
                    </ul>
                </section>

                <section>
                    <h2>6. Your Rights and Choices</h2>

                    <h3>6.1 Access and Control</h3>
                    <ul>
                        <li><strong>View Your Data:</strong> Access your personal information</li>
                        <li><strong>Update Information:</strong> Correct or update your data</li>
                        <li><strong>Delete Account:</strong> Request account deletion (subject to legal requirements)</li>
                        <li><strong>Data Portability:</strong> Export your data in a standard format</li>
                    </ul>
                </section>

                <section>
                    <h2>7. Contact Information</h2>

                    <h3>7.1 Privacy Questions</h3>
                    <p>If you have questions about this Privacy Policy or our data practices:</p>
                    <ul>
                        <li><strong>Email:</strong> privacy@mehko-ai.com</li>
                        <li><strong>Address:</strong> [Your Business Address]</li>
                        <li><strong>Phone:</strong> [Your Phone Number]</li>
                    </ul>

                    <h3>7.2 Data Requests</h3>
                    <p>For data access, correction, or deletion requests:</p>
                    <ul>
                        <li><strong>Email:</strong> data-requests@mehko-ai.com</li>
                    </ul>
                </section>

                <div className="legal-note">
                    <p>
                        <strong>Note:</strong> This Privacy Policy is a template and should be reviewed by legal counsel
                        to ensure compliance with applicable laws and regulations in your jurisdiction.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
