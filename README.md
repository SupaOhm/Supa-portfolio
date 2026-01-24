# Supa's Portfolio

A modern, interactive portfolio website built with React, TypeScript, and Tailwind CSS. Features smooth section navigation, a beautiful 3D carousel for project showcase, and interactive cursor effects.

## ✨ Features

- **Smooth Section Navigation** - Navigate between Home, About, Projects, and Connect sections with smooth scrolling
- **Active Section Indicator** - Visual indicator tracks which section is currently in view
- **3D Project Carousel** - Beautiful 3D carousel with rotating cards and smooth transitions
- **Interactive Cursor Effects** - Cursor-following gradient effects on project cards
- **Responsive Design** - Fully responsive layout that works on desktop, tablet, and mobile
- **Dark Theme** - Modern dark theme with blue/purple accent colors
- **Grid & Carousel Views** - Toggle between carousel and grid view for projects
- **Smooth Animations** - Fluid transitions and animations throughout

## 🛠️ Tech Stack

- **React** 19.2.0 - UI framework
- **TypeScript** 5.9.3 - Type safety
- **React Router** 7.12.0 - Client-side routing
- **Tailwind CSS** 3.4.19 - Styling and animations
- **Vite** 7.2.4 - Build tool

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/SupaOhm/Supa-portfolio.git
cd Supa-portfolio
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

The portfolio will be available at `http://localhost:5173`

## 📦 Build

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## 📂 Project Structure

```
src/
├── components/
│   ├── Navbar.tsx         # Navigation bar with section tracking
│   ├── Hero.tsx           # Landing section with typing animation
│   ├── About.tsx          # About section with skills
│   ├── Projects.tsx       # 3D carousel and grid view for projects
│   ├── ProjectCard.tsx    # Individual project card with effects
│   └── Connect.tsx        # Contact/connect section
├── pages/
│   └── Home.tsx          # Main home page composition
├── types/
│   └── project.ts        # Project type definitions
├── App.tsx               # Main app component with router
├── main.tsx              # React entry point
└── index.css             # Global styles and animations
```

## 🎨 Key Components

### Navbar
- Fixed navigation with smooth scrolling between sections
- IntersectionObserver tracks active section with threshold of 0.6
- Responsive mobile menu
- Active indicator underline

### Projects Carousel
- 3D perspective transform carousel
- Center card is scaled to 1.0 with full brightness
- Adjacent cards rotate 35 degrees with 0.85 scale
- Far cards fade with reduced brightness
- Infinite looping with next/previous buttons
- Dot navigation for direct access

### Project Card
- Interactive cursor-following gradient effects
- Two gradient circles for visual depth
- Smooth easing (0.15 factor) for cursor tracking
- Links to GitHub and live demos

### Hero Section
- Typing animation cycling through different roles
- Cursor-following gradient effects
- Smooth easing animation

## 🎯 Navigation

- **Portfolio Button** - Scrolls to home/top
- **Home** - Landing section (Hero)
- **About** - Skills and bio
- **Projects** - 3D carousel showcase
- **Connect** - Contact information

## 📱 Responsive Breakpoints

- Mobile: 0px - 640px
- Tablet: 641px - 1024px
- Desktop: 1025px+

## 🔧 Customization

### Update Projects
Edit the projects array in `src/components/Projects.tsx`:
```typescript
const projects: Project[] = [
  {
    id: '1',
    title: 'Your Project',
    description: 'Description',
    tags: ['Tech1', 'Tech2'],
    githubUrl: 'https://github.com/...',
    demoUrl: 'https://...'
  }
];
```

### Adjust Colors
Modify Tailwind color classes in components. The portfolio uses:
- Primary: `blue-400` to `blue-500`
- Secondary: `purple-400` to `purple-500`
- Background: `gray-900` to `gray-950`

## 📄 License

This project is open source and available under the MIT License.

## 👤 Author

**SupaOhm**
- GitHub: [@SupaOhm](https://github.com/SupaOhm)

## 🙏 Acknowledgments

- React and Vite communities
- Tailwind CSS for styling utilities
- Inspiration from modern portfolio designs

