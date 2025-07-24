# Stock Strategy Backtester

A fullstack web application for backtesting simple moving average (SMA) based trading strategies using historical stock data.

## 🚀 Features

### Core Functionality

- **Rule-based Strategy Creation**: Define if-then-else trading rules using SMA indicators
- **Historical Backtesting**: Test strategies on real historical stock data via Yahoo Finance
- **Interactive Results**: View equity curves, performance metrics, and trade statistics
- **Real-time Charts**: Dynamic equity curve visualization using Chart.js

### Advanced Features

- **User Authentication**: JWT-based login/registration system
- **PostgreSQL Integration**: Persistent storage of backtest results and user data
- **Analytics Dashboard**: Track popular tickers and user backtest history
- **Mock Payment Integration**: Stripe-like payment interface for premium features
- **PostHog Analytics**: Event tracking for user interactions
- **Dockerized Deployment**: Complete containerized setup

## 🛠 Tech Stack

### Frontend

- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **Chart.js** for data visualization
- **PostHog** for analytics

### Backend

- **FastAPI** with Python 3.11
- **Backtrader** for backtesting engine
- **yfinance** for stock data
- **SQLAlchemy** ORM with PostgreSQL
- **JWT** authentication

### Infrastructure

- **PostgreSQL** database
- **Docker & Docker Compose**
- **Redis** for caching (optional)

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

## 🚀 Quick Start with Docker

1. **Clone the repository**

```bash
git clone <repository-url>
cd stock-backtester
```

2. **Create the project structure**

```
stock-backtester/
├── backend/
│   ├── main_enhanced.py
│   ├── models.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   └── page.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── init.sql
```

3. **Start all services**

```bash
docker-compose up -d
```

4. **Access the application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🔧 Local Development Setup

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/testdb"
export SECRET_KEY="your-secret-key"

# Run the server
uvicorn main_enhanced:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Database Setup

```bash
# Start PostgreSQL container
docker run -d --name postgres-db \
  -e POSTGRES_DB=testdb \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 postgres:15

# Run migrations (tables will be created automatically)
```

## 🎯 Usage

### Basic Backtesting Flow

1. **Register/Login**: Create an account or use demo credentials
2. **Configure Strategy**:

   - Enter stock ticker (e.g., AAPL, TSLA, MSFT)
   - Set date range for backtesting
   - Choose SMA period (e.g., 10, 20, 50 days)
   - Define trading rule:
     - **If condition**: price > sma, price < sma, etc.
     - **Then action**: buy, sell, hold
     - **Else action**: hold, sell, exit

3. **Run Backtest**: Click "Run Backtest" to execute the strategy
4. **Analyze Results**: View performance metrics and equity curve

### API Usage

```bash
# Register a new user
curl -X POST "http://localhost:8000/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Run a backtest
curl -X POST "http://localhost:8000/backtest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "ticker": "AAPL",
    "start_date": "2022-01-01",
    "end_date": "2022-12-31",
    "sma_period": 10,
    "rule": {
      "if_condition": "price > sma",
      "then_action": "buy",
      "else_action": "hold"
    }
  }'
```

## 📊 Performance Metrics

The backtester calculates several key metrics:

- **Total Return**: Percentage gain/loss over the period
- **Win Rate**: Percentage of profitable trades
- **Number of Trades**: Total executed trades
- **Sharpe Ratio**: Risk-adjusted return measure
- **Final Portfolio Value**: Ending portfolio value
- **Equity Curve**: Daily portfolio value progression

## 🔧 Configuration

### Environment Variables

**Backend (.env)**

```
DATABASE_URL=postgresql://user:password@localhost:5432/testdb
SECRET_KEY=your-super-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Frontend (.env.local)**

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 🚀 Deployment

### AWS Deployment (Backend)

1. **Create EC2 instance** with Python 3.11
2. **Install dependencies**:

```bash
sudo yum update -y
sudo yum install python3.11 python3-pip postgresql-devel gcc -y
```

3. **Deploy application**:

```bash
git clone <repository-url>
cd stock-backtester/backend
pip3 install -r requirements.txt
uvicorn main_enhanced:app --host 0.0.0.0 --port 8000
```

4. **Set up reverse proxy** with Nginx
5. **Configure SSL** with Let's Encrypt

### Vercel Deployment (Frontend)

1. **Connect GitHub repository** to Vercel
2. **Set environment variables**:
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.com`
3. **Deploy automatically** on push to main branch

## 📁 Project Structure

```
stock-backtester/
├── backend/
│   ├── main_enhanced.py          # Enhanced FastAPI app with auth
│   ├── models.py                 # Database models and repositories
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile               # Backend container config
│   └── tests/                   # Backend tests
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Main backtester interface
│   │   ├── login/
│   │   │   └── page.tsx         # Login page
│   │   └── register/
│   │       └── page.tsx         # Registration page
│   ├── components/              # Reusable React components
│   ├── package.json            # Node.js dependencies
│   ├── tailwind.config.js      # Tailwind configuration
│   └── Dockerfile              # Frontend container config
├── docker-compose.yml          # Multi-service orchestration
├── init.sql                    # Database initialization
└── README.md                   # This file
```

## 🔍 API Endpoints

### Authentication

- `POST /register` - Create new user account
- `POST /login` - Authenticate user and get JWT token

### Backtesting

- `POST /backtest` - Run backtest strategy
- `GET /backtest/history` - Get user's backtest history

### Analytics

- `GET /analytics/popular-tickers` - Get most backtested stocks
- `GET /user/profile` - Get current user profile

### Payments (Mock)

- `POST /payment/create-intent` - Create payment intent for premium features

### Health

- `GET /health` - Health check endpoint

## 🎨 Frontend Components

### Key React Components

- **BacktesterForm**: Strategy configuration interface
- **ResultsDisplay**: Performance metrics and charts
- **EquityCurveChart**: Interactive equity curve visualization
- **AuthForms**: Login and registration components

### State Management

- Uses React hooks (`useState`, `useEffect`) for local state
- JWT tokens stored in memory (not localStorage for security)
- Form validation with real-time feedback

## 🏗 Architecture Decisions

### Backend Architecture

- **FastAPI**: Chosen for automatic API documentation and type safety
- **Backtrader**: Professional-grade backtesting framework
- **SQLAlchemy**: ORM for database abstraction
- **JWT Authentication**: Stateless authentication for scalability

### Frontend Architecture

- **Next.js**: Server-side rendering and optimal performance
- **TypeScript**: Type safety and better developer experience
- **Tailwind CSS**: Utility-first CSS for rapid development
- **Chart.js**: Lightweight charting library

### Database Design

- **User Table**: Basic user authentication and profile data
- **Backtest Runs Table**: Complete backtest history with JSON equity curves
- **Indexes**: Optimized for common queries (user backtests, popular tickers)

## 🔒 Security Considerations

### Authentication & Authorization

- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: BCrypt for secure password storage
- **CORS Configuration**: Restricted to allowed origins
- **Input Validation**: Pydantic models for request validation

### Data Security

- **SQL Injection Prevention**: SQLAlchemy ORM parameterized queries
- **Rate Limiting**: TODO - Implement rate limiting for API endpoints
- **Environment Variables**: Sensitive data stored in env vars

## 🚨 Known Limitations & TODOs

### Current Limitations

1. **Simple Strategy Logic**: Only supports basic SMA crossover strategies
2. **Single Asset**: No portfolio or multi-asset backtesting
3. **No Advanced Metrics**: Missing metrics like maximum drawdown, Calmar ratio
4. **Limited Data Sources**: Only Yahoo Finance integration
5. **No Real-time Data**: Historical data only

### Planned Improvements

- [ ] Add more technical indicators (RSI, MACD, Bollinger Bands)
- [ ] Implement advanced portfolio metrics
- [ ] Add data caching with Redis
- [ ] Implement rate limiting and API quotas
- [ ] Add email notifications for completed backtests
- [ ] Create admin dashboard for system monitoring
- [ ] Add export functionality (PDF reports, CSV data)
- [ ] Implement real-time paper trading simulation

## 🐛 Troubleshooting

### Common Issues

**Backend won't start**

```bash
# Check if all dependencies are installed
pip install -r requirements.txt

# Verify database connection
export DATABASE_URL="postgresql://user:password@localhost:5432/testdb"
python -c "from models import engine; print('DB connected!')"
```

**Frontend build errors**

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

**Database connection errors**

```bash
# Ensure PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker logs testdb
```

**CORS errors**

- Verify `NEXT_PUBLIC_API_URL` environment variable
- Check FastAPI CORS middleware configuration

## 📊 Performance Optimization

### Backend Optimizations

- **Database Indexing**: Indexes on frequently queried columns
- **Connection Pooling**: SQLAlchemy connection pool
- **Async Operations**: FastAPI async endpoints where beneficial
- **Caching**: Redis caching for frequently accessed data

### Frontend Optimizations

- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component
- **Static Generation**: Pre-rendered pages where possible
- **Bundle Analysis**: Webpack bundle analyzer

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/new-indicator`
3. **Make changes** and add tests
4. **Run tests**: `npm test` and `pytest`
5. **Submit pull request**

### Code Style

- **Backend**: Follow PEP 8 with Black formatter
- **Frontend**: ESLint and Prettier configuration
- **Commits**: Conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Backtrader**: Excellent Python backtesting framework
- **Yahoo Finance**: Free historical stock data
- **FastAPI**: Modern Python web framework
- **Next.js**: React framework for production applications

## 📞 Support

For questions or support:

- **Email**: support@example.com
- **GitHub Issues**: Create an issue for bugs or feature requests
- **Documentation**: Check `/docs` endpoint for API documentation

---

**Development Time**: ~6 hours (as requested)
**Status**: ✅ Core functionality complete, bonus features implemented
