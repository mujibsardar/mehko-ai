import React from 'react';
import './Footer.scss';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer" style={{ border: '2px solid red' }}>
            <div className="footer-content">
                <div className="footer-section">
                    <h3>MEHKO AI</h3>
                    <p>AI-powered permit application assistance for mobile food facilities.</p>
                </div>

                <div className="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="/">Home</a></li>
                        <li><a href="/applications">Applications</a></li>
                        <li><a href="/dashboard">Dashboard</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Support</h4>
                    <ul>
                        <li><a href="/help">Help Center</a></li>
                        <li><a href="/contact">Contact Us</a></li>
                        <li><a href="/faq">FAQ</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="/privacy">Privacy Policy</a></li>
                        <li><a href="/terms">Terms of Service</a></li>
                        <li><a href="/cookies">Cookie Policy</a></li>
                    </ul>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="footer-bottom-content">
                    <p>&copy; {currentYear} MEHKO AI. All rights reserved.</p>
                    <div className="footer-bottom-links">
                        <a href="/privacy">Privacy</a>
                        <span className="separator">•</span>
                        <a href="/terms">Terms</a>
                        <span className="separator">•</span>
                        <a href="/cookies">Cookies</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
