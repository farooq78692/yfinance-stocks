from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import yfinance as yf
import backtrader as bt
import pandas as pd
import numpy as np
import time
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session


# Import our database models
from models import (
    get_db, BacktestRepository, UserRepository, User, BacktestRun,
    create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, create_tables
)

# Initialize database
create_tables()

app = FastAPI(title="Stock Strategy Backtester API", version="1.0.0")

# Security
security = HTTPBearer()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Rule(BaseModel):
    if_condition: str = "price > sma"
    then_action: str = "buy"
    else_action: str = "hold"

class BacktestRequest(BaseModel):
    ticker: str
    start_date: str
    end_date: str
    sma_period: int
    rule: Rule

class BacktestResponse(BaseModel):
    total_return: float
    win_rate: float
    number_of_trades: int
    equity_curve: List[Dict[str, Any]]
    final_portfolio_value: float
    sharpe_ratio: float
    backtest_id: Optional[int] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int

class PaymentRequest(BaseModel):
    amount: int  # in cents
    currency: str = "usd"

# Authentication dependency
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    from jose import JWTError, jwt
    from models import SECRET_KEY, ALGORITHM
    
    try:
        token = credentials.credentials
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
        except JWTError as e:
            print(f"JWT Error: {str(e)}")
            raise credentials_exception
        
        user_repo = UserRepository(db)
        user = user_repo.get_user_by_email(email=email)
        if user is None:
            raise credentials_exception
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication service error: {str(e)}"
        )

# Backtrader Strategy (same as before)
class SMAStrategy(bt.Strategy):
    params = (
        ('sma_period', 10),
        ('rule', None),
    )
    
    def __init__(self):
        self.sma = bt.indicators.SimpleMovingAverage(
            self.data.close, period=self.params.sma_period
        )
        self.trades = []
        self.equity_curve = []
        
    def next(self):
        current_price = self.data.close[0]
        sma_value = self.sma[0]
        
        self.equity_curve.append({
            'date': self.data.datetime.date(0).isoformat(),
            'portfolio_value': self.broker.getvalue(),
            'price': current_price,
            'sma': sma_value
        })
        
        condition_met = self._evaluate_condition(current_price, sma_value)
        
        if condition_met:
            action = self.params.rule.then_action
        else:
            action = self.params.rule.else_action
            
        if action == "buy" and not self.position:
            self.buy()
        elif action == "sell" and self.position:
            self.sell()
        
    def _evaluate_condition(self, price, sma):
        condition = self.params.rule.if_condition.lower()
        
        if "price > sma" in condition:
            return price > sma
        elif "price < sma" in condition:
            return price < sma
        elif "price >= sma" in condition:
            return price >= sma
        elif "price <= sma" in condition:
            return price <= sma
        else:
            return price > sma
    
    def notify_trade(self, trade):
        if trade.isclosed:
            self.trades.append({
                'entry_date': trade.dtopen,
                'exit_date': trade.dtclose,
                'pnl': trade.pnl,
                'pnl_net': trade.pnlcomm
            })

# def download_stock_data(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
#     try:
#         stock = yf.Ticker(ticker)
#         print("Stock:", stock)
#         data = stock.history(start=start_date, end=end_date)
#         print("Data:", data)
#         if data.empty:
#             raise ValueError(f"No data found for ticker {ticker}")
#         print("Downloaded data:", data.head())
#         return data
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Error downloading data: {str(e)}")

def download_stock_data(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    try:
        print(f"Downloading data for: {ticker} from {start_date} to {end_date}")
        stock = yf.Ticker(ticker)
        data = stock.history(start=start_date, end=end_date)

        if data.empty:
            raise ValueError(f"No data found for ticker '{ticker}' - it may be delisted or there may be a network issue.")

        print("Downloaded data (head):", data.head())
        return data

    except Exception as e:
        print("Error details:", str(e))
        raise HTTPException(status_code=400, detail=f"Error downloading data: {str(e)}")

def run_backtest(data: pd.DataFrame, sma_period: int, rule: Rule) -> Dict:
    data_feed = bt.feeds.PandasData(dataname=data)
    cerebro = bt.Cerebro()
    cerebro.addstrategy(SMAStrategy, sma_period=sma_period, rule=rule)
    cerebro.adddata(data_feed)
    
    initial_cash = 10000
    cerebro.broker.setcash(initial_cash)
    cerebro.broker.setcommission(commission=0.001)
    
    strategies = cerebro.run()
    strategy = strategies[0]
    
    final_value = cerebro.broker.getvalue()
    total_return = ((final_value - initial_cash) / initial_cash) * 100
    
    winning_trades = len([t for t in strategy.trades if t['pnl'] > 0])
    total_trades = len(strategy.trades)
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    
    equity_values = [point['portfolio_value'] for point in strategy.equity_curve]
    returns = np.diff(equity_values) / equity_values[:-1]
    sharpe_ratio = np.mean(returns) / np.std(returns) * np.sqrt(252) if np.std(returns) != 0 else 0
    
    return {
        'total_return': round(total_return, 2),
        'win_rate': round(win_rate, 2),
        'number_of_trades': total_trades,
        'equity_curve': strategy.equity_curve,
        'final_portfolio_value': round(final_value, 2),
        'sharpe_ratio': round(sharpe_ratio, 2)
    }

# Routes
@app.get("/")
async def root():
    return {"message": "Stock Strategy Backtester API v1.0.0", "status": "online"}

# Test endpoint without authentication for debugging
@app.post("/backtest/test", response_model=BacktestResponse)
async def test_backtest_strategy(request: BacktestRequest):
    """Test endpoint for backtesting without authentication - for development only"""
    start_time = time.time()
    
    try:
        # Validate dates
        start_date = datetime.strptime(request.start_date, "%Y-%m-%d")
        end_date = datetime.strptime(request.end_date, "%Y-%m-%d")
        
        if start_date >= end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
        
        # Download stock data
        stock_data = download_stock_data(request.ticker, request.start_date, request.end_date)
        
        print(stock_data)

        # Run backtest
        results = run_backtest(stock_data, request.sma_period, request.rule)
        print(results)
        
        # Note: Not saving to database for test endpoint
        return BacktestResponse(**results)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error details: {str(e)}")  # Log the actual error
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/register", response_model=Token)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        user_repo = UserRepository(db)
        
        # Check if user exists
        if user_repo.get_user_by_email(user.email):
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        
        # Create user
        db_user = user_repo.create_user(user.email, user.password)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": db_user.id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

@app.post("/login", response_model=Token)
async def login_user(user: UserLogin, db: Session = Depends(get_db)):
    try:
        user_repo = UserRepository(db)
        
        db_user = user_repo.authenticate_user(user.email, user.password)
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": db_user.id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


@app.post("/backtest", response_model=BacktestResponse)
async def backtest_strategy(
    request: BacktestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_time = time.time()
    
    try:
        # Validate dates
        start_date = datetime.strptime(request.start_date, "%Y-%m-%d")
        end_date = datetime.strptime(request.end_date, "%Y-%m-%d")
        
        if start_date >= end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
        
        # Download stock data
        stock_data = download_stock_data(request.ticker, request.start_date, request.end_date)
        
        # Run backtest
        results = run_backtest(stock_data, request.sma_period, request.rule)
        
        # Save to database
        backtest_repo = BacktestRepository(db)
        execution_time = time.time() - start_time
        
        backtest_data = {
            'ticker': request.ticker,
            'start_date': request.start_date,
            'end_date': request.end_date,
            'sma_period': request.sma_period,
            'rule': request.rule.dict(),
            'results': results,
            'execution_time': execution_time
        }
        
        saved_backtest = backtest_repo.save_backtest_run(backtest_data, current_user.id)
        
        return BacktestResponse(**results, backtest_id=saved_backtest.id)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Backtest error: {str(e)}")  # Log the actual error
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/backtest/history")
async def get_backtest_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20
):
    backtest_repo = BacktestRepository(db)
    backtests = backtest_repo.get_user_backtests(current_user.id, limit)
    
    return {
        "backtests": [
            {
                "id": bt.id,
                "ticker": bt.ticker,
                "start_date": bt.start_date,
                "end_date": bt.end_date,
                "total_return": bt.total_return,
                "win_rate": bt.win_rate,
                "number_of_trades": bt.number_of_trades,
                "created_at": bt.created_at.isoformat()
            }
            for bt in backtests
        ]
    }

@app.get("/analytics/popular-tickers")
async def get_popular_tickers(db: Session = Depends(get_db)):
    backtest_repo = BacktestRepository(db)
    popular = backtest_repo.get_popular_tickers(limit=10)
    
    return {
        "popular_tickers": [
            {"ticker": ticker, "count": count}
            for ticker, count in popular
        ]
    }

@app.post("/payment/create-intent")
async def create_payment_intent(
    payment: PaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Set user to premium
    current_user.is_premium = True
    db.commit()

    # Mock Stripe payment intent creation
    return {
        "client_secret": f"pi_mock_{payment.amount}_{current_user.id}",
        "payment_intent_id": f"pi_mock_{payment.amount}",
        "amount": payment.amount,
        "currency": payment.currency,
        "status": "requires_payment_method"
    }

@app.get("/user/profile")
async def get_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_premium": current_user.is_premium,
        "created_at": current_user.created_at.isoformat()
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)