/**
 * PublicLayout.jsx
 * Wraps all public-facing pages (About, Features, Pricing, FAQ, Contact)
 * with Navbar + Footer.
 */
import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
