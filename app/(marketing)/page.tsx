import Hero from '@/components/marketing/sections/Hero';
import ProductShowcase from '@/components/marketing/sections/ProductShowcase';
import Storefronts from '@/components/marketing/sections/Storefronts';
import ProductIndex from '@/components/marketing/sections/ProductIndex';
import MoneyRail from '@/components/marketing/sections/MoneyRail';
import Automation from '@/components/marketing/sections/Automation';
import Steps from '@/components/marketing/sections/Steps';
import CtaBanner from '@/components/marketing/sections/CtaBanner';

export const metadata = {
  title: 'DigiOne | Sell Digital Products in India',
  description: 'The premium platform for Indian creators to build, auto DM, and monetize.',
};

export default function MarketingPage() {
  return (
    <div className="flex flex-col w-full overflow-hidden bg-white">
      <Hero />
      <ProductShowcase />
      <Storefronts />
      <ProductIndex />
      <MoneyRail />
      <Automation />
      <Steps />
      <CtaBanner />
    </div>
  );
}
