import React from "react";

export default function Landing({ onStart = () => {}, onShowSetup = () => {} }) {
  return (
    <div className="bg-white text-gray-900 dark:bg-neutral-900 dark:text-neutral-100">
      {/* Utility styles ported from provided HTML */}
      <style>{`
        .gradient-text {
          background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-gradient {
          background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .comment-bubble {
          position: relative;
          background: #1F2937; /* gray-800 */
          color: white;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 8px;
          border: 1px solid #374151; /* gray-700 */
        }
        .comment-bubble::after {
          content: '';
          position: absolute;
          bottom: -8px;
          right: 20px;
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solid #1F2937;
        }
        .mode-indicator {
          background: linear-gradient(90deg, #10B981 0%, #059669 100%); /* emerald */
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>

      {/* Top Bar */}
      <div className="bg-orange-50 border-b border-orange-100 py-2">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-orange-800">
            📍 Built on Y Combinator principles: <strong>Make something people want. Ship it fast.</strong>
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-20">
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <span className="mode-indicator">SHIP MODE: ACTIVATED</span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-black mb-6">
            The AI Cofounder
            <br />
            That <span className="gradient-text">Actually Ships</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-neutral-300 max-w-3xl mx-auto mb-8">
            Stop overthinking. Start validating. Ship Mode keeps you focused on what matters:{" "}
            <span className="font-semibold text-gray-900 dark:text-neutral-100">getting to your first customer.</span>
          </p>

          {/* YC Quote */}
          <div className="bg-gray-50 dark:bg-neutral-800 border-l-4 border-orange-500 p-4 max-w-2xl mx-auto mb-8 text-left">
            <p className="text-gray-700 dark:text-neutral-200 italic">
              "The only way to win is to learn faster than anyone else. Build product, talk to users, iterate. That's it."
            </p>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2">— Paul Graham, Y Combinator</p>
          </div>

          {/* Live Demo Preview */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 max-w-2xl mx-auto mb-8 border border-gray-200 dark:border-neutral-800">
            <div className="text-left mb-4">
              <div className="text-gray-500 dark:text-neutral-400 text-sm mb-2">You write:</div>
              <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded font-mono text-sm text-gray-700 dark:text-neutral-200">
                I think we need user auth, payment processing, and admin dashboard before launch...
              </div>
            </div>
            <div className="comment-bubble text-left">
              <p className="text-sm font-medium">
                "Strip it down. What's the ONE feature that proves your hypothesis? Ship that. PayPal's MVP was literally sending money via email."
              </p>
            </div>
            <div className="text-right mt-2">
              <span className="text-xs text-gray-500 dark:text-neutral-400">— ShipMode AI</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              className="hero-gradient text-white font-bold px-8 py-4 rounded-lg text-lg hover:opacity-90 transition shadow-lg"
              onClick={onStart}
            >
              Activate Ship Mode →
            </button>
            <button
              className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 font-bold px-8 py-4 rounded-lg text-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition border-2 border-gray-300 dark:border-neutral-700"
              onClick={() => {
                try {
                  const el = document.getElementById("how-it-works");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                } catch {}
              }}
            >
              Watch It Work
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-4">Free trial. No credit card. Ship your first feature today.</p>
        </div>
      </section>

      {/* The YC Way Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto bg-orange-50 dark:bg-[#2a211a]">
        <h2 className="text-3xl font-bold text-center mb-4">Built on Startup Wisdom That Works</h2>
        <p className="text-center text-gray-600 dark:text-neutral-300 mb-12">
          Every response is grounded in proven principles from YC, successful founders, and lean methodology.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: "🚀", title: '"Launch Now"', quote: "If you're not embarrassed by your first version, you launched too late.", author: "Reid Hoffman, LinkedIn" },
            { icon: "👥", title: '"Talk to Users"', quote: "The mom test: Talk about their life, not your idea. Facts, not opinions.", author: "Rob Fitzpatrick" },
            { icon: "🎯", title: `"Do Things That Don't Scale"`, quote: "Recruit users one by one. Delight them. Then figure out how to scale.", author: "Paul Graham, YC" },
          ].map((card, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <div className="text-orange-500 text-2xl mb-3">{card.icon}</div>
              <h3 className="font-bold mb-2">{card.title}</h3>
              <p className="text-gray-600 dark:text-neutral-300 text-sm mb-3">{card.quote}</p>
              <p className="text-xs text-gray-500 dark:text-neutral-500 italic">— {card.author}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How Ship Mode Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Your Cofounder for Shipping Fast</h2>
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                {[
                  { n: "1", t: "Write Your Real Thoughts", d: "Product ideas, features, problems. Be honest about what you're building." },
                  { n: "2", t: "Get Focused Guidance", d: "AI identifies when you're overbuilding and redirects you to validation." },
                  { n: "3", t: "Ship & Learn Faster", d: "Launch MVPs in days, not months. Get real feedback, not assumptions." },
                ].map((s) => (
                  <div key={s.n} className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">{s.n}</div>
                    <div className="ml-4">
                      <h3 className="font-bold mb-1">{s.t}</h3>
                      <p className="text-gray-600 dark:text-neutral-300 text-sm">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-6 border border-gray-200 dark:border-neutral-800">
              <div className="space-y-4">
                <div className="text-gray-500 dark:text-neutral-400 text-xs uppercase tracking-wide">Your Daily Standup:</div>
                <div className="font-mono text-sm text-gray-700 dark:text-neutral-200">
                  Working on user dashboard. Need to add charts, export features, team management...
                </div>
                <div className="comment-bubble">
                  <p className="text-sm">
                    "What problem does the dashboard solve? Can you validate that with a spreadsheet first? Stripe started with 7 lines of code."
                  </p>
                </div>
                <div className="font-mono text-sm text-gray-700 dark:text-neutral-200 mt-4">But competitors have full dashboards</div>
                <div className="comment-bubble">
                  <p className="text-sm">"Dropbox beat competitors with a video of a non-existent product. Focus on the core value, not feature parity."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto bg-gray-50 dark:bg-neutral-800">
        <h2 className="text-3xl font-bold text-center mb-4">The Ship Mode Principles</h2>
        <p className="text-center text-gray-600 dark:text-neutral-300 mb-12">Every piece of advice follows these core truths about building startups</p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[
            { title: "🏗️ Build → Measure → Learn", desc: "The Lean Startup loop. Ship Mode ensures you complete the cycle fast.", ex: "Instead of perfecting that feature, ship it and measure user behavior." },
            { title: "✂️ MVP Over Everything", desc: "Minimum Viable Product. Emphasis on minimum AND viable.", ex: "Cut features until it hurts, then ship. Uber started in one city." },
            { title: "👂 Customer Development", desc: "Get out of the building. Talk to real users, not imaginary ones.", ex: "You wrote 'users might want.' Go find 5 users and ask them." },
            { title: "⏱️ Speed as Strategy", desc: "The only advantage startups have is speed. Use it or lose.", ex: "3 weeks on this feature? Ship v1 today, iterate tomorrow." },
          ].map((p, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 p-6 rounded-lg border border-gray-200 dark:border-neutral-800">
              <h3 className="font-bold text-lg mb-3 text-orange-600">{p.title}</h3>
              <p className="text-gray-700 dark:text-neutral-200 mb-3">{p.desc}</p>
              <div className="bg-orange-50 dark:bg-[#2a211a] p-3 rounded text-sm">
                <strong>Example:</strong> "{p.ex}"
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Real Examples Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">What Ship Mode Actually Says</h2>
        <p className="text-gray-600 dark:text-neutral-300 text-center mb-12">Real guidance based on real patterns we see in founders</p>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[
            { label: "When you're overbuilding:", text: `"Facebook started at one college. What's your Harvard?"` },
            { label: "When you're overthinking:", text: `"Analysis paralysis killed more startups than bad ideas ever did."` },
            { label: "When you mention competitors:", text: `"Worry about customers, not competitors. WhatsApp had 50 engineers for 900M users."` },
            { label: "When you avoid launching:", text: `"Reddit's first user was fake. They still launched. What's your excuse?"` },
            { label: "When you finally ship:", text: `"YES! Now get 10 users to try it. Real feedback beats any assumption."`, positive: true },
            { label: "When planning features:", text: `"Will this help you find product-market fit? No? Then why build it?"` },
          ].map((ex, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-800">
              <div className="text-xs text-gray-500 dark:text-neutral-500 uppercase mb-2">{ex.label}</div>
              <p className={ex.positive ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-900 dark:text-neutral-100 font-medium"}>
                {ex.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto bg-white dark:bg-neutral-900">
        <h2 className="text-3xl font-bold text-center mb-4">Simple Pricing. Ship Today.</h2>
        <p className="text-gray-600 dark:text-neutral-300 text-center mb-12">Less than your monthly coffee budget. Worth more than any course.</p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Trial */}
          <div className="bg-white dark:bg-neutral-900 p-8 rounded-lg border-2 border-gray-200 dark:border-neutral-800">
            <h3 className="text-xl font-bold mb-2">Try Ship Mode</h3>
            <div className="text-3xl font-bold mb-6">7 Days Free</div>
            <ul className="space-y-3 mb-8">
              {["Full Ship Mode access", "No credit card required", "Ship your first MVP"].map((t, i) => (
                <li key={i} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <button className="w-full bg-gray-900 dark:bg-neutral-100 dark:text-neutral-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-200 transition" onClick={onStart}>
              Start Free Trial
            </button>
          </div>

          {/* Pro */}
          <div className="bg-gradient-to-b from-orange-50 to-white dark:from-[#2a211a] dark:to-neutral-900 p-8 rounded-lg border-2 border-orange-500 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">RECOMMENDED</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Ship Mode Pro</h3>
            <div className="text-3xl font-bold mb-6">
              $29<span className="text-lg font-normal text-gray-600 dark:text-neutral-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {["YC-inspired guidance", "Customizable intensity", "Progress tracking", "Commitment reminders", "Cancel anytime"].map((t, i) => (
                <li key={i} className="flex items-start">
                  <svg className="w-5 h-5 text-orange-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <span className="font-medium">{t}</span>
                </li>
              ))}
            </ul>
            <button className="w-full hero-gradient text-white font-bold py-3 rounded-lg hover:opacity-90 transition" onClick={onStart}>
              Activate Ship Mode →
            </button>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-neutral-300">
            <strong>The math:</strong> If Ship Mode helps you launch 1 month earlier, it's worth $1000s in opportunity cost.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Common Questions</h2>
        <div className="space-y-6">
          {[
            {
              q: "Is it actually helpful or just annoying?",
              a: "Ship Mode is direct but constructive. Every piece of advice is actionable and grounded in startup best practices. You control the intensity.",
            },
            {
              q: "What makes this different from ChatGPT?",
              a: "Ship Mode is specifically trained on startup principles. It watches your progress, remembers context, and actively pushes you toward shipping. It's not a Q&A tool—it's an accountability partner.",
            },
            {
              q: "Can I adjust how pushy it is?",
              a: "Yes. Choose from Gentle (encouraging), Direct (clear guidance), or Intense (maximum push). You can change modes anytime or pause when you need deep focus.",
            },
            {
              q: "Does it work for non-technical founders?",
              a: "Absolutely. Ship Mode focuses on validation and customer development, not code. It'll push you to test ideas with no-code tools, landing pages, and manual processes.",
            },
            {
              q: "What about my data privacy?",
              a: "Your notes stay in your browser. We only send context snippets to generate responses. No storage of your ideas or plans.",
            },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 p-6 rounded-lg border border-gray-200 dark:border-neutral-800">
              <h3 className="font-bold mb-2">{item.q}</h3>
              <p className="text-gray-600 dark:text-neutral-300">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center bg-orange-50 dark:bg-[#2a211a]">
        <h2 className="text-4xl font-bold mb-6">Your Competitors Are Shipping.</h2>
        <p className="text-xl text-gray-700 dark:text-neutral-200 mb-8">Every day you plan is a day they're getting customer feedback.</p>
        <button className="hero-gradient text-white font-bold px-12 py-5 rounded-lg text-xl hover:opacity-90 transition shadow-lg" onClick={onStart}>
          Activate Ship Mode Now →
        </button>
        <p className="text-sm text-gray-600 dark:text-neutral-400 mt-4">7-day free trial. Ship your first MVP this week.</p>

        <div className="mt-12 p-6 bg-white dark:bg-neutral-900 rounded-lg border border-orange-200 dark:border-orange-900/40 max-w-md mx-auto">
          <p className="text-gray-700 dark:text-neutral-200 font-medium">
            "The best time to start was yesterday. The second best time is now. Stop reading. Start shipping."
          </p>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-2">— Ship Mode, waiting for you</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto text-center">
          <p className="mb-4">Built by founders who spent too long in planning mode. Now we ship.</p>
          <div className="flex justify-center space-x-6 text-sm">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Twitter</a>
            <a href="#" className="hover:text-white">Blog</a>
          </div>
          <p className="text-xs mt-8">© {new Date().getFullYear()} ShipMode. Made with urgency in San Francisco.</p>
        </div>
      </footer>

      {/* Floating Orb Preview */}
      <div className="fixed bottom-8 right-8 hidden lg:block">
        <div className="relative">
          <div className="w-16 h-16 hero-gradient rounded-full pulse-slow flex items-center justify-center cursor-pointer shadow-lg" onClick={onStart}>
            <span className="text-2xl">🚀</span>
          </div>
          <div className="absolute bottom-20 right-0 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 text-sm px-3 py-2 rounded-lg whitespace-nowrap border border-gray-200 dark:border-neutral-800 shadow-lg">
            <span className="mode-indicator mr-2">SHIP MODE</span> Ready to help
          </div>
        </div>
      </div>
    </div>
  );
}
