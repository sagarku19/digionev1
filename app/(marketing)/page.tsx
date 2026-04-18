import Hero from '@/components/marketing/sections/Hero';
import Marquee from '@/components/marketing/sections/Marquee';
import Features from '@/components/marketing/sections/Features';
import ProductTypes from '@/components/marketing/sections/ProductTypes';
import Steps from '@/components/marketing/sections/Steps';
import Showcase from '@/components/marketing/sections/Showcase';
import Testimonials from '@/components/marketing/sections/Testimonials';
import CtaBanner from '@/components/marketing/sections/CtaBanner';

export const metadata = {
  title: 'DigiOne | Sell Digital Products in India',
  description: 'The premium platform for Indian creators to build, auto DM, and monetize.',
};

export default function MarketingPage() {
  return (
    <div className="flex flex-col w-full overflow-hidden bg-white">
      <Hero />
      <Marquee />
      <Features />
      <ProductTypes />
      <Steps />
      <Showcase />
      <Testimonials />
      <CtaBanner />
    </div>
  );
}
