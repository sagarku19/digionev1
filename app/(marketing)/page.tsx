import Hero from '@/components/marketing/sections/Hero';
import Marquee from '@/components/marketing/sections/Marquee';
import Features from '@/components/marketing/sections/Features';
import ProductTypes from '@/components/marketing/sections/ProductTypes';
import Steps from '@/components/marketing/sections/Steps';
import Showcase from '@/components/marketing/sections/Showcase';
import Testimonials from '@/components/marketing/sections/Testimonials';
import PricingPreview from '@/components/marketing/sections/PricingPreview';
import FaqAccordion from '@/components/marketing/sections/FaqAccordion';
import CtaBanner from '@/components/marketing/sections/CtaBanner';

export const metadata = {
  title: 'DigiOne | Sell Digital Products in India',
  description: 'The platform serious Indian creators use to build their business. Store, Blog, Payments, GST compliance ready.',
};

export default function MarketingPage() {
  return (
    <div className="flex flex-col w-full overflow-hidden">
      <Hero />
      <Marquee />
      <Features />
      <ProductTypes />
      <Steps />
      <Showcase />
      <Testimonials />
      <PricingPreview />
      <FaqAccordion />
      <CtaBanner />
    </div>
  );
}