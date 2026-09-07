import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import HeroBackground from "../components/common/HeroBackground";
import HeroSearch from "../components/homepage/HeroSearch";
import SectionDivider from "../components/common/SectionDivider";
import FloatingOrbs from "../components/common/FloatingOrbs";
import api from "../lib/api";
import { BASE_DOMAIN, BRAND_NAME } from "../lib/constants";

import CategoriesShowcase from "../components/home/CategoriesShowcase";
import TrustVerification from "../components/home/TrustVerification";
import FeaturedThisWeek from "../components/home/FeaturedThisWeek";
import BuiltForVendors from "../components/home/BuiltForVendors";
import WeddingBudgetPlanner from "../components/home/WeddingBudgetPlanner";
import Testimonials from "../components/home/Testimonials";
import VendorCTA from "../components/home/VendorCTA";

export default function Home() {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/homepage")
      .then(({ data }) => setHomeData(data.data))
      .catch(() => setHomeData(null))
      .finally(() => setLoading(false));
  }, []);

  const featured  = homeData?.featured_vendors || [];
  const topCities = homeData?.top_cities || [];

  return (
    <>
      <Helmet>
        <title>{BRAND_NAME} - Find Verified Wedding & Event Vendors Near You</title>
        <meta
          name="description"
          content={`Search, compare and directly contact verified banquet halls, decorators, caterers, photographers and every other wedding or event vendor on ${BRAND_NAME}.`}
        />
        <link rel="canonical" href={`https://www.${BASE_DOMAIN}/`} />
      </Helmet>

      {/* Ambient drifting brand-colour orbs behind the whole page */}
      <FloatingOrbs />

      <div className="relative z-10">
        {/* Hero  - untouched, exactly as it was */}
        <HeroBackground file="hero.png" opacity={0.35}>
          <HeroSearch topCities={topCities} />
        </HeroBackground>

        <CategoriesShowcase />
        <SectionDivider variant="wave" from="#ffffff" to="#fff6ea" />

        {/* warm gold-tinted panel  - was flat grey */}
        <TrustVerification />
        <SectionDivider variant="sharpAngle" from="#fff6ea" to="#eef0f8" glow="#e8192c" />

        {/* cool navy-tinted panel  - alternates against the gold above */}
        <FeaturedThisWeek vendors={featured} loading={loading} />
        <SectionDivider variant="zigzagAngle" from="#eef0f8" to="#ffffff" height={130} lineColor="#c9cfe0" dotColor="#e8192c" />

        <BuiltForVendors />
        <SectionDivider variant="zigzag" from="#ffffff" to="#fdeeed" />

        {/* soft red-tinted panel, ties back to the accent colour */}
        <WeddingBudgetPlanner />
        <SectionDivider variant="sharpAngle" from="#fdeeed" to="#fff6ea" glow="#f5a623" />

        <Testimonials />
        <SectionDivider variant="zigzagAngle" from="#fff6ea" to="#1a2035" height={130} lineColor="#e8c9a3" dotColor="#f5a623" glow="#e8192c" />

        <VendorCTA />
      </div>
    </>
  );
}