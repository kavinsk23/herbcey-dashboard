import React from "react";

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-black-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-black-900 text-4xl font-bold mb-2">
            🌿 HerbCey Color Test
          </h1>
          <p className="text-black-600">
            Testing all brand colors and black variations
          </p>
        </div>

        {/* HerbCey Brand Colors */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-black-800 text-2xl font-bold mb-4">
            HerbCey Brand Colors
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-herbcey-light p-4 rounded-lg text-center">
              <div className="text-black-800 font-semibold">Light</div>
              <div className="text-black-600 text-sm">#a8e063</div>
            </div>

            <div className="bg-herbcey-main p-4 rounded-lg text-center">
              <div className="text-white font-semibold">Main</div>
              <div className="text-white text-sm">#7cb342</div>
            </div>

            <div className="bg-herbcey-dark p-4 rounded-lg text-center">
              <div className="text-white font-semibold">Dark</div>
              <div className="text-white text-sm">#4a7c59</div>
            </div>

            <div className="bg-herbcey-leaf p-4 rounded-lg text-center">
              <div className="text-white font-semibold">Leaf</div>
              <div className="text-white text-sm">#388e3c</div>
            </div>
          </div>

          {/* Quick Access Colors */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-primary p-4 rounded-lg text-center">
              <div className="text-white font-semibold">Primary</div>
            </div>
            <div className="bg-secondary p-4 rounded-lg text-center">
              <div className="text-white font-semibold">Secondary</div>
            </div>
          </div>
        </div>

        {/* Text Colors Test */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-black-800 text-2xl font-bold mb-4">
            Text Colors
          </h2>
          <div className="space-y-2">
            <p className="text-herbcey-light text-lg">HerbCey Light Text</p>
            <p className="text-herbcey-main text-lg">HerbCey Main Text</p>
            <p className="text-herbcey-dark text-lg">HerbCey Dark Text</p>
            <p className="text-primary text-lg">Primary Text</p>
            <p className="text-secondary text-lg">Secondary Text</p>
          </div>
        </div>

        {/* Black/Gray Variations */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-black-800 text-2xl font-bold mb-4">
            Black & Gray Variations
          </h2>

          {/* Background Colors */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            <div className="bg-black-50 p-3 rounded text-center">
              <div className="text-black-800 text-xs font-semibold">50</div>
            </div>
            <div className="bg-black-100 p-3 rounded text-center">
              <div className="text-black-800 text-xs font-semibold">100</div>
            </div>
            <div className="bg-black-200 p-3 rounded text-center">
              <div className="text-black-800 text-xs font-semibold">200</div>
            </div>
            <div className="bg-black-300 p-3 rounded text-center">
              <div className="text-black-800 text-xs font-semibold">300</div>
            </div>
            <div className="bg-black-400 p-3 rounded text-center">
              <div className="text-white text-xs font-semibold">400</div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-6">
            <div className="bg-black-500 p-3 rounded text-center">
              <div className="text-white text-xs font-semibold">500</div>
            </div>
            <div className="bg-black-600 p-3 rounded text-center">
              <div className="text-white text-xs font-semibold">600</div>
            </div>
            <div className="bg-black-700 p-3 rounded text-center">
              <div className="text-white text-xs font-semibold">700</div>
            </div>
            <div className="bg-black-800 p-3 rounded text-center">
              <div className="text-white text-xs font-semibold">800</div>
            </div>
            <div className="bg-black-900 p-3 rounded text-center">
              <div className="text-white text-xs font-semibold">900</div>
            </div>
          </div>

          {/* Text Colors */}
          <div className="space-y-1">
            <p className="text-black-900 text-lg">Black 900 - Main headings</p>
            <p className="text-black-800 text-lg">Black 800 - Subheadings</p>
            <p className="text-black-700 text-lg">Black 700 - Body text</p>
            <p className="text-black-600 text-lg">Black 600 - Secondary text</p>
            <p className="text-black-500 text-lg">Black 500 - Muted text</p>
            <p className="text-black-400 text-lg">Black 400 - Light text</p>
          </div>
        </div>

        {/* Button Examples */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-black-800 text-2xl font-bold mb-4">
            Button Examples
          </h2>
          <div className="flex flex-wrap gap-4">
            <button className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-herbcey-dark">
              Primary Button
            </button>

            <button className="bg-secondary text-white px-6 py-3 rounded-lg font-semibold hover:bg-herbcey-leaf">
              Secondary Button
            </button>

            <button className="bg-black-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-black-900">
              Dark Button
            </button>

            <button className="bg-black-100 text-black-800 px-6 py-3 rounded-lg font-semibold hover:bg-black-200">
              Light Button
            </button>

            <button className="border-2 border-primary text-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary hover:text-white">
              Outline Button
            </button>
          </div>
        </div>

        {/* Cards Example */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-black-800 text-2xl font-bold mb-4">
            Card Examples
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black-50 border border-black-200 p-4 rounded-lg">
              <h3 className="text-black-800 font-bold mb-2">Light Card</h3>
              <p className="text-black-600">Card with light background</p>
            </div>

            <div className="bg-herbcey-light bg-opacity-20 border border-herbcey-main p-4 rounded-lg">
              <h3 className="text-herbcey-dark font-bold mb-2">Brand Card</h3>
              <p className="text-black-700">Card with brand colors</p>
            </div>

            <div className="bg-black-800 p-4 rounded-lg">
              <h3 className="text-white font-bold mb-2">Dark Card</h3>
              <p className="text-black-200">Card with dark background</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center bg-herbcey-main text-white p-6 rounded-xl">
          <h2 className="text-2xl font-bold mb-2">🎉 All Colors Working!</h2>
          <p>Your HerbCey color system is ready to use</p>
        </div>
      </div>
    </div>
  );
};

export default App;
