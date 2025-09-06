import React from 'react';
import './Footer.scss';

export default function Footer() {
  return (
    <footer className="mehko-footer">
      <div className="footer-content">
        <p className="footer-text">
          MEHKO.ai was built using the AI-powered coding methods taught at{' '}
          <a 
            href="https://aicodingtutor.org" 
            target="_blank" 
            rel="nofollow"
            className="footer-link"
          >
            AICodingTutor.org
          </a>
        </p>
      </div>
    </footer>
  );
}