# RentTrack

- RentFlow is a modern, full-stack **Boarding House Management System** designed to streamline property operations for both administrators and tenants. Built with a focus on speed, aesthetics, and user experience, RentFlow simplifies room allocation, billing, and maintenance tracking.

## Key Features

### Smart Allocation

Efficiently manage room occupancy with an intuitive interface. Keep track of available units and assign residents with ease.

### Automated Billing

Generate invoices automatically and track payment statuses. Tenants can view their payment history and upcoming balances through their dedicated portal.

### Live Maintenance

A real-time repair request system. Tenants can report issues directly from their dashboard, and admins can track, assign, and resolve them efficiently.

### Modern Aesthetics

- **Premium Design**: A high-end, responsive UI featuring smooth glassmorphism and kinetic typography.
- **Dynamic Themes**: Seamless transitions between sleek Dark Mode and professional Light Mode.
- **Fluid Animations**: Enhanced user experience powered by Framer Motion and custom CSS transitions.

## Technology Stack

### Frontend

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: Tailwind CSS & Vanilla CSS
- **Animations**: Framer Motion
- **Icons**: Custom SVG & Lucide-inspired glyphs

### Backend

- **Runtime**: Node.js
- **API**: Express.js
- **Database**: PostgreSQL / MongoDB (configurable)
- **Real-time**: WebSockets for maintenance updates

## Architecture

- **App Router**: Uses Next.js 15 App Router for modern routing.
- **Client Components**: Heavily utilizes React Client Components for interactive UI elements.
- **Shared Components**: Reusable components like `ThemeToggle` and `FeatureCard` located in `src/components`.

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd rentflow
   ```

2. **Setup Backend**

   ```bash
   cd backend
   npm install
   # Configure your .env file
   node server.js
   ```

3. **Setup Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Portal**
   Open [http://localhost:3000] in your browser.

## Portals

- **Admin Portal**: Comprehensive control panel for property managers to oversee residents, billing, and maintenance.
- **Tenant Portal**: User-friendly dashboard for residents to pay rent, check room details, and request repairs.

run ollama: ollama launch opencode --model qwen3.5:4b

_Built by CodeCrizzz._
