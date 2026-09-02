import React from 'react';
import Navbar  from '../../components/layout/Navbar';
import Footer  from '../../components/layout/Footer';
import HeroSection        from '../../components/home/HeroSection';
import StatsSection       from '../../components/home/StatsSection';
import FeaturesSection    from '../../components/home/FeaturesSection';
import HowItWorksSection  from '../../components/home/HowItWorksSection';
import SubjectsSection    from '../../components/home/SubjectsSection';
import PricingSection     from '../../components/home/PricingSection';
import TestimonialsSection from '../../components/home/TestimonialsSection';
import CTASection         from '../../components/home/CTASection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <SubjectsSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
