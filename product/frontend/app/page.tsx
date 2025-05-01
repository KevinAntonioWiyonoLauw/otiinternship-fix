'use client';

import { Calendar, Video, BarChart3, MessageSquare } from 'lucide-react';
import SpotlightCard from '@/components/ui/SpotlightCard';
import BlurText from '@/components/ui/BlurText';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import SplineScene from '@/components/SplineScene';
import AnimatedBeam from '@/components/ui/animated-beam';
import { AspirasiCard } from '@/components/aspirasi/AspirasiCard';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getAspirations } from '@/api/aspirasi';
import { Loader2 } from 'lucide-react';

interface Aspiration {
  id: number;
  senderId: string;
  subject: string;
  target: string;
  message: string;
  createdAt: string;
}

export default function Home() {
  const [aspirations, setAspirations] = useState<Aspiration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const previewCount = 8;
  const displayAspirations = expanded ? aspirations : aspirations.slice(0, previewCount);

  useEffect(() => {
    const fetchAspirations = async () => {
      try {
        setLoading(true);
        // Using the API function imported from api/aspirasi
        const data = await getAspirations();
        setAspirations(data);
      } catch (err) {
        console.error("Error fetching aspirations:", err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAspirations();
  }, []);

  return (
    <main className="relative bg-[#1F1F1F]">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section with 3D Background */}
      <section className="relative min-h-screen h-[100vh] max-h-[1080px] overflow-hidden">
        {/* Animated Background */}
        <AnimatedBeam className="absolute inset-0">
          {/* 3D Robot Container */}
          <div className="absolute inset-0 max-w-[1920px] mx-auto">
            <SplineScene />
          </div>
        </AnimatedBeam>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center ml-5 md:ml-0">
          <div className="max-w-[1400px] w-full mx-auto text-center relative">
            <div className="absolute inset-0 flex items-center justify-center mix-blend-difference pointer-events-none">
              <BlurText
                text="We Make IT For Everyone"
                delay={150}
                animateBy="words"
                direction="top"
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4 md:mb-8 [text-shadow:_0_1px_20px_rgb(255_255_255_/_40%)] tracking-tight"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-6 bg-[#1F1F1F]">
        <div className="max-w-[1400px] mx-auto">
          <BlurText
            text="Platform Features"
            delay={100}
            animateBy="words"
            direction="top"
            className="text-4xl md:text-5xl font-bold text-white text-center mb-16"
          />

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <SpotlightCard className="group transition-all duration-300 hover:scale-105">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-primary-500/10 mb-6">
                  <Calendar className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">Schedule Meetings</h3>
                <p className="text-gray-400 text-lg">Organize & join team meetings seamlessly.</p>
              </div>
            </SpotlightCard>

            <SpotlightCard className="group transition-all duration-300 hover:scale-105">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-primary-500/10 mb-6">
                  <Video className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">Create Trainings</h3>
                <p className="text-gray-400 text-lg">Host and attend technical trainings.</p>
              </div>
            </SpotlightCard>

            <SpotlightCard className="group transition-all duration-300 hover:scale-105">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-primary-500/10 mb-6">
                  <BarChart3 className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">Track Progress</h3>
                <p className="text-gray-400 text-lg">Visualize your committee & training progress.</p>
              </div>
            </SpotlightCard>

            <SpotlightCard className="group transition-all duration-300 hover:scale-105">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-primary-500/10 mb-6">
                  <MessageSquare className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">Submit Aspirations</h3>
                <p className="text-gray-400 text-lg">Share ideas & feedback anonymously.</p>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* Aspirasi Preview Section */}
      <section className="relative z-10 py-24 px-6 bg-[#1F1F1F]">
        <div className="max-w-[1400px] mx-auto">
          <BlurText
            text="Aspirasi"
            delay={100}
            animateBy="words"
            direction="top"
            className="text-4xl md:text-5xl font-bold text-white text-center mb-16"
          />
          <div className="relative">
            {/* Canvas Container */}
            <div className="rounded-2xl bg-[#232323] shadow-lg p-8 pt-12 transition-all duration-300">
              {loading ? (
                <div className="flex justify-center items-center h-80">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center text-red-500">{error}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {displayAspirations.map((aspirasi) => (
                    <AspirasiCard key={aspirasi.id} aspirasi={aspirasi} containerHeight="auto" />
                  ))}
                </div>
              )}
              {/* Gradient & Expand Button */}
              {!expanded && !loading && (
                <div className="absolute left-0 bottom-0 w-full h-80 flex items-end justify-center pointer-events-none">
                  <div className="w-full h-full absolute left-0 bottom-0 bg-gradient-to-t from-[#1F1F1F]/90 via-[#1F1F1F]/80 to-[#1F1F1F]/50" />
                  <button
                    onClick={() => setExpanded(true)}
                    className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-[#232323] shadow-lg border border-white/10 text-white hover:bg-[#333] transition pointer-events-auto mb-2"
                  >
                    <ChevronDown className="w-7 h-7" />
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Collapse button if expanded */}
          {expanded && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setExpanded(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#232323] hover:bg-[#333] text-white transition"
              >
                Tampilkan Lebih Sedikit
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}