import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { PublicAuthProvider } from "./context/PublicAuthContext.jsx";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import MobileNav from "./components/layout/MobileNav";
import GetYourWebsite from "./pages/GetYourWebsite";

const HomePage = lazy(() => import("./pages/Home"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const CategoriesIndexPage = lazy(() => import("./pages/CategoriesIndexPage"));
const CitiesIndexPage = lazy(() => import("./pages/CitiesIndexPage"));
const ForVendorsPage = lazy(() => import("./pages/ForVendorsPage"));
const CityOrStatePage = lazy(() => import("./pages/CityOrStatePage"));
const CityCategoryPage = lazy(() => import("./pages/CityCategoryPage"));
const ThirdSegmentResolver = lazy(() => import("./pages/ThirdSegmentResolver"));
const RegisterFreePage = lazy(() => import("./pages/RegisterFreePage"));
const ReviewTokenPage = lazy(() => import("./pages/ReviewTokenPage.jsx"));
const AboutPage = lazy(() => import("./pages/static/AboutPage"));
const ContactPage = lazy(() => import("./pages/static/ContactPage"));
const PrivacyPage = lazy(() => import("./pages/static/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/static/TermsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function PageLoader() {
  return <div className="max-w-6xl mx-auto px-4 py-16 text-gray-400">Loading...</div>;
}

export default function App() {
  return (
    <PublicAuthProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/categories" element={<CategoriesIndexPage />} />
              <Route path="/cities" element={<CitiesIndexPage />} />
              <Route path="/for-vendors" element={<ForVendorsPage />} />
              <Route path="/get-website" element={<GetYourWebsite />} />
              <Route path="/register-free" element={<RegisterFreePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/review/:token" element={<ReviewTokenPage />} />
              <Route path="/:slug" element={<CityOrStatePage />} />
              <Route path="/:city/:category" element={<CityCategoryPage />} />
              <Route path="/:city/:category/:slug" element={<ThirdSegmentResolver />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <MobileNav />
      </div>
    </PublicAuthProvider>
  );
}