from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class BacktestRun(Base):
    __tablename__ = "backtest_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # Optional for anonymous users
    ticker = Column(String, nullable=False, index=True)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    sma_period = Column(Integer, nullable=False)
    
    # Store rule as JSON
    rule_condition = Column(String, nullable=False)
    rule_then_action = Column(String, nullable=False)
    rule_else_action = Column(String, nullable=False)
    
    # Results
    total_return = Column(Float, nullable=False)
    win_rate = Column(Float, nullable=False)
    number_of_trades = Column(Integer, nullable=False)
    final_portfolio_value = Column(Float, nullable=False)
    sharpe_ratio = Column(Float, nullable=False)
    
    # Store equity curve as JSON (for detailed analysis)
    equity_curve = Column(JSON, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    execution_time_seconds = Column(Float, nullable=True)

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Database operations
class BacktestRepository:
    def __init__(self, db):
        self.db = db
    
    def save_backtest_run(self, backtest_data: dict, user_id: int = None) -> BacktestRun:
        """Save a backtest run to the database"""
        db_backtest = BacktestRun(
            user_id=user_id,
            ticker=backtest_data['ticker'],
            start_date=backtest_data['start_date'],
            end_date=backtest_data['end_date'],
            sma_period=backtest_data['sma_period'],
            rule_condition=backtest_data['rule']['if_condition'],
            rule_then_action=backtest_data['rule']['then_action'],
            rule_else_action=backtest_data['rule']['else_action'],
            total_return=backtest_data['results']['total_return'],
            win_rate=backtest_data['results']['win_rate'],
            number_of_trades=backtest_data['results']['number_of_trades'],
            final_portfolio_value=backtest_data['results']['final_portfolio_value'],
            sharpe_ratio=backtest_data['results']['sharpe_ratio'],
            equity_curve=backtest_data['results']['equity_curve'],
            execution_time_seconds=backtest_data.get('execution_time')
        )
        
        self.db.add(db_backtest)
        self.db.commit()
        self.db.refresh(db_backtest)
        return db_backtest
    
    def get_user_backtests(self, user_id: int, limit: int = 50):
        """Get recent backtests for a user"""
        return self.db.query(BacktestRun).filter(
            BacktestRun.user_id == user_id
        ).order_by(BacktestRun.created_at.desc()).limit(limit).all()
    
    def get_popular_tickers(self, limit: int = 10):
        """Get most backtested tickers"""
        from sqlalchemy import func
        return self.db.query(
            BacktestRun.ticker,
            func.count(BacktestRun.ticker).label('count')
        ).group_by(BacktestRun.ticker).order_by(
            func.count(BacktestRun.ticker).desc()
        ).limit(limit).all()

# User authentication utilities
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import timedelta

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

class UserRepository:
    def __init__(self, db):
        self.db = db
    
    def get_user_by_email(self, email: str):
        return self.db.query(User).filter(User.email == email).first()
    
    def create_user(self, email: str, password: str):
        hashed_password = get_password_hash(password)
        db_user = User(email=email, hashed_password=hashed_password)
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
    
    def authenticate_user(self, email: str, password: str):
        user = self.get_user_by_email(email)
        if not user:
            return False
        if not verify_password(password, user.hashed_password):
            return False
        return user