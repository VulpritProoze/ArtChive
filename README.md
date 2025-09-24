# ArtChive 🎨

A social networking platform designed to empower Filipino artists, especially up-and-coming and amateur artists, by connecting them seamlessly with professional artists.

![ArtChive](https://img.shields.io/badge/ArtChive-Empowering_Filipino_Artists-blue?style=for-the-badge&logo=artstation)

## ✨ Features

- **Brush Drips Reward System**: Points-based reward system for active "artchivists"
- **Multi-format Posting**: Customizable posting system supporting novels, images, and video media
- **Gallery Creation Tool**: Built-in gallery creation and organization
- **Avatar Customization**: High degree of freedom in avatar personalization
- **Social Networking**: Connect with artists across experience levels

## 🛠️ Tech Stack

### Frontend
- **Framework**: React with TypeScript
- **Styling**: TailwindCSS with DaisyUI components

### Backend
- **Framework**: Django with Django REST Framework (DRF)
- **Authentication**: Django Simple JWT with HTTP-only cookies
- **Caching**: Redis
- **Server**: Daphne (handles both async and synchronous requests)
- **Database**: PostgreSQL

### Development & Deployment
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Environment**: Containerized development environment

## 🚀 Getting Started

### Prerequisites
- Docker
- Docker Compose
- Node.js (for local development without containers)
- Python 3.8+ (for local development without containers)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/artchive.git
   cd artchive
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ENV_EXAMPLE=123
   ```

3. **Start with Docker Compose (Recommended)**
   ```bash
   docker-compose up --build
   ```
   This will start:
   - Backend server on http://localhost:8000
   - Frontend server on http://localhost:5173
   - Redis cache
   - PostgreSQL database (within a container)

4. **Alternative: Manual Setup**
   ```bash
   # Backend setup
   cd backend
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   
   # Frontend setup (in another terminal)
   cd frontend
   npm install
   npm run dev
   ```

## 📁 Project Structure

```
artchive/
├── backend/                  # Django backend
│   ├── artchive/             # Django project
│   ├── core/                 # Core app
│   ├── media/                # Media files (development)
│   ├── common/               # For utilities
│   ├── manage.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # React + Typescript
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   ├── utils/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── vite.config.ts
├── docker-compose.yaml
└── README.md
```

## 🔧 Configuration

### Environment Variables
```
DJANGO_SETTINGS_MODULE=secret
DJANGO_SECRET_KEY=secret
DJANGO_DEBUG=secret
ADMIN_USER=secret
ADMIN_PASS=secret
ADMIN_EMAIL=secret

JWT_SECRET_KEY=secret
JWT_ALGORITHM=secret
AUTH_COOKIE_SECURE=secret

POSTGRES_DB=secret
POSTGRES_USER=secret
POSTGRES_PASSWORD=secret
POSTGRES_HOST=secret
POSTGRES_PORT=secret
LC_ALL=secret
LANG=secret

VITE_API_URL=secret
```

## 🧪 Testing

```bash
Will fill in info soon...
```

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

Will fill in info soon...

## 🙏 Acknowledgments

- Filipino artist community for inspiration
- Contributors and maintainers
- Open source libraries that made this project possible

## 📞 Support

If you have any questions or need support, please:
1. Check our [documentation](docs/)
2. Open an [issue](https://github.com/VulpritProoze/artchive/issues)
3. Contact us at support@artchive.ph

## 🏛️ Governance

ArtChive is maintained by:
- [Contributors](https://github.com/VulpritProoze/artchive/graphs/contributors)

---

<div align="center">
Made with ❤️ for the Filipino artist community
</div>
