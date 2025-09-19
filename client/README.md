# Kiro-mini Frontend

React-based frontend for the Kiro-mini medical imaging and billing integration system.

## Features

- **Modern React Architecture**: Built with React 18, TypeScript, and Material-UI
- **Real-time Communication**: WebSocket integration for live code suggestions and validation
- **DICOM Image Viewer**: Cornerstone.js integration for medical image display
- **AI-Assisted Reporting**: Real-time AI suggestions and 1-minute workflow support
- **Billing Integration**: Live CPT/ICD-10 code validation and superbill generation
- **Responsive Design**: Mobile-friendly interface with adaptive layouts

## Tech Stack

- **React 18** with TypeScript
- **Material-UI (MUI)** for component library
- **React Router** for navigation
- **React Query** for API state management
- **Cornerstone.js** for DICOM image viewing
- **WebSocket** for real-time communication
- **Axios** for HTTP requests

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend services running (see main README)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm start
```

The application will be available at http://localhost:3000

### Environment Variables

- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:8000)
- `REACT_APP_WS_URL`: WebSocket URL (default: ws://localhost:8000)
- `REACT_APP_ORTHANC_URL`: Orthanc server URL (default: http://localhost:8042)

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Common/         # Generic components
│   ├── Layout/         # Layout components
│   ├── DICOM/          # DICOM viewer components
│   ├── Reports/        # Report-related components
│   └── Billing/        # Billing components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # API and external services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── theme.ts           # Material-UI theme configuration
```

## Key Components

### Layout Components
- `Layout`: Main application layout with sidebar and header
- `Sidebar`: Navigation sidebar with user profile and menu items

### Page Components
- `Dashboard`: System overview and statistics
- `StudyList`: List of DICOM studies with filtering and search
- `StudyViewer`: DICOM image viewer with measurement tools
- `ReportEditor`: AI-assisted report creation and editing
- `BillingDashboard`: Real-time billing validation and code suggestions

### Context Providers
- `AuthContext`: User authentication and session management
- `WebSocketContext`: Real-time communication with backend

## Development

### Available Scripts

- `npm start`: Start development server
- `npm build`: Build for production
- `npm test`: Run test suite
- `npm run lint`: Run ESLint
- `npm run type-check`: Run TypeScript type checking

### Code Style

The project uses ESLint and TypeScript for code quality. Follow these guidelines:

- Use TypeScript for all new files
- Follow Material-UI design patterns
- Use React hooks and functional components
- Implement proper error handling
- Add loading states for async operations

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Features Implementation Status

- [x] Basic React application structure
- [x] Authentication and routing
- [x] Material-UI theme and layout
- [x] WebSocket integration
- [ ] DICOM image viewer (Task 10)
- [ ] AI-assisted report panel (Task 11)
- [ ] Real-time billing validation (Task 12)
- [ ] Comprehensive testing suite (Task 15)

## API Integration

The frontend communicates with the backend through:

- **REST API**: Standard CRUD operations for studies, reports, and billing
- **WebSocket**: Real-time code suggestions and validation
- **Orthanc WADO-RS**: DICOM image retrieval

### Authentication

The application uses JWT tokens for authentication:
- Tokens are stored in localStorage
- Automatic token refresh on API calls
- Redirect to login on token expiration

### Error Handling

- Global error boundary for React errors
- API error interceptors with user-friendly messages
- Loading states and skeleton screens
- Retry logic for failed requests

## Deployment

### Production Build

```bash
npm run build
```

The build artifacts will be in the `build/` directory.

### Docker Deployment

The frontend is containerized and deployed as part of the Docker Compose stack. See the main project README for deployment instructions.

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new interfaces
3. Include tests for new components and features
4. Update documentation for significant changes
5. Use semantic commit messages

## Security Considerations

- All API calls include authentication headers
- Sensitive data is not stored in localStorage
- HTTPS is required for production deployment
- HIPAA compliance considerations for PHI handling

## Performance Optimization

- Code splitting with React.lazy()
- Image optimization for DICOM display
- Virtual scrolling for large study lists
- Memoization for expensive calculations
- Service worker for offline capabilities (future)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This project is part of the Kiro-mini prototype system. See the main project LICENSE file for details.