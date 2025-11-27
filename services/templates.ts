export const DEFAULT_TEMPLATE = {
  id: 'blank',
  name: 'Blank Canvas',
  html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Website</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-white text-slate-900">
    <div class="min-h-screen flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 m-4 rounded-2xl">
        <div class="text-center">
            <h1 class="text-2xl font-bold text-slate-400 mb-2">Blank Canvas</h1>
            <p class="text-slate-500">Start building your website...</p>
        </div>
    </div>
</body>
</html>`
};

export const TEMPLATES = [
  DEFAULT_TEMPLATE,
  {
    id: 'saas-landing',
    name: 'SaaS Landing Page',
    thumbnail: 'https://placehold.co/600x400/2563eb/ffffff?text=SaaS',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SaaS Landing Page</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-slate-50">
    <nav class="bg-white border-b border-slate-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex items-center">
                    <span class="text-2xl font-bold text-blue-600">AcmeCorp</span>
                </div>
                <div class="flex items-center gap-4">
                    <a href="#" class="text-slate-600 hover:text-slate-900">Features</a>
                    <a href="#" class="text-slate-600 hover:text-slate-900">Pricing</a>
                    <a href="#" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Get Started</a>
                </div>
            </div>
        </div>
    </nav>
    
    <section class="bg-white py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 class="text-5xl font-bold text-slate-900 mb-6">Ship your software faster</h1>
            <p class="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">The ultimate platform for building, testing, and deploying your applications with ease.</p>
            <div class="flex justify-center gap-4">
                <button class="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700">Start Free Trial</button>
                <button class="bg-white text-slate-700 border border-slate-300 px-8 py-3 rounded-lg text-lg font-medium hover:bg-slate-50">View Demo</button>
            </div>
        </div>
    </section>

    <section class="py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Lightning Fast</h3>
                    <p class="text-slate-600">Optimized for speed and performance right out of the box.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Secure by Default</h3>
                    <p class="text-slate-600">Enterprise-grade security features included in every plan.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Analytics</h3>
                    <p class="text-slate-600">Detailed insights into your usage and performance metrics.</p>
                </div>
            </div>
        </div>
    </section>
</body>
</html>`
  },
  {
    id: 'portfolio-dark',
    name: 'Creative Portfolio',
    thumbnail: 'https://placehold.co/600x400/0f172a/ffffff?text=Portfolio',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Creative Portfolio</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>body { font-family: 'Space Grotesk', sans-serif; }</style>
</head>
<body class="bg-slate-900 text-white">
    <header class="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div class="text-2xl font-bold tracking-tighter">ALEX.DESIGN</div>
        <nav class="hidden md:flex gap-8">
            <a href="#" class="hover:text-purple-400 transition-colors">Work</a>
            <a href="#" class="hover:text-purple-400 transition-colors">About</a>
            <a href="#" class="hover:text-purple-400 transition-colors">Contact</a>
        </nav>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-20">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
                <h1 class="text-6xl md:text-8xl font-bold leading-none mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
                    Digital<br>Experience<br>Designer
                </h1>
                <p class="text-xl text-slate-400 mb-10 max-w-md">I craft immersive web experiences for forward-thinking brands and startups.</p>
                <a href="#" class="inline-block bg-white text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-slate-200 transition-colors">View My Work</a>
            </div>
            <div class="relative">
                <div class="absolute -inset-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-2xl opacity-30"></div>
                <img src="https://picsum.photos/600/600?grayscale" alt="Abstract 3D Art" class="relative rounded-2xl w-full object-cover aspect-square">
            </div>
        </div>

        <div class="mt-32">
            <h2 class="text-3xl font-bold mb-12 flex items-center gap-4">
                <span class="w-12 h-px bg-slate-700"></span>
                Selected Projects
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="group cursor-pointer">
                    <div class="overflow-hidden rounded-xl mb-4">
                        <img src="https://picsum.photos/800/600?random=1" class="w-full h-[300px] object-cover transition-transform duration-500 group-hover:scale-105" alt="Project 1">
                    </div>
                    <h3 class="text-2xl font-bold">Neon Finance</h3>
                    <p class="text-slate-400">Fintech Dashboard UI</p>
                </div>
                <div class="group cursor-pointer">
                    <div class="overflow-hidden rounded-xl mb-4">
                        <img src="https://picsum.photos/800/600?random=2" class="w-full h-[300px] object-cover transition-transform duration-500 group-hover:scale-105" alt="Project 2">
                    </div>
                    <h3 class="text-2xl font-bold">EcoLife</h3>
                    <p class="text-slate-400">Sustainable Living App</p>
                </div>
            </div>
        </div>
    </main>

    <footer class="border-t border-slate-800 mt-20 py-10 text-center text-slate-500">
        &copy; 2024 Alex Designer. Built with Gemini.
    </footer>
</body>
</html>`
  }
];