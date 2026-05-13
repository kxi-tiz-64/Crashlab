import React from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

function HomePage({ navigate }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="py-20 text-center relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 -z-10 opacity-10 dark:opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="container mx-auto px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Resilio
            </span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-700 dark:text-slate-200 mb-6">
            Strategy Resilience Studio
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Test your trading algorithms against synthetic market crashes — before the next black swan event.
          </p>
          <Button 
            onClick={() => navigate('load')} 
            size="lg" 
            className="px-8 py-6 text-lg font-medium transition-all hover:scale-105"
          >
            Get Started →
          </Button>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-12 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow bg-background/60 backdrop-blur-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="text-4xl">🌍</div>
                <CardTitle className="text-xl font-bold">Global Markets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Access stocks from NIFTY 500, S&P 500, FTSE 100, and 8+ international indices with high-fidelity historical data.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-background/60 backdrop-blur-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="text-4xl">⚡</div>
                <CardTitle className="text-xl font-bold">Realistic Attack Simulation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Spoofing, quote stuffing, flash crashes — all with adjustable intensity, granular parameters, and real-time visualization.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-background/60 backdrop-blur-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="text-4xl">📊</div>
                <CardTitle className="text-xl font-bold">Robustness Scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  A single, mathematically rigorous number derived from cross-scenario performance that ranks your strategy's survival under stress.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
          
          <div className="relative">
            {/* Horizontal Line for Desktop */}
            <div className="hidden md:block absolute top-6 left-1/2 -translate-x-1/2 w-[75%] border-t-2 border-blue-100 dark:border-slate-800 z-0"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-4 relative z-10">
              {[
                { 
                  num: 1, 
                  title: "Load Stock Data", 
                  desc: "Choose any index and time horizon from our global asset registry." 
                },
                { 
                  num: 2, 
                  title: "Simulate Market Crash", 
                  desc: "Apply realistic manipulation models to stress-test your assumptions." 
                },
                { 
                  num: 3, 
                  title: "Run Your Strategy", 
                  desc: "Write Python code in our secure sandbox with full technical analysis libraries." 
                },
                { 
                  num: 4, 
                  title: "Compare & Rank Resilience", 
                  desc: "Analyze robustness scores and equity curves side-by-side to find the ultimate strategy." 
                }
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center px-2">
                  <div className="rounded-full bg-blue-600 text-white w-12 h-12 flex items-center justify-center text-xl font-bold mb-6 shadow-md shadow-blue-200 dark:shadow-none">
                    {step.num}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t border-slate-100 dark:border-slate-800 text-center">
        <div className="container mx-auto px-4 flex flex-col gap-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Built for academic research and quantitative exploration.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">Formerly - CrashLab.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            &copy; 2026 Resilio.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
