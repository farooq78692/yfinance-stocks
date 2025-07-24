#!/usr/bin/env python3
"""
Test script for the Stock Backtester API
This script demonstrates how to use both authenticated and unauthenticated endpoints.
"""

import requests
import json

# API Base URL
BASE_URL = "http://localhost:8000"

# Sample backtest request
sample_request = {
    "ticker": "AAPL",
    "start_date": "2022-01-01",
    "end_date": "2022-12-31",
    "sma_period": 10,
    "rule": {
        "if_condition": "price > sma",
        "then_action": "buy",
        "else_action": "hold"
    }
}

def test_unauthenticated_backtest():
    """Test the /backtest/test endpoint (no authentication required)"""
    print("Testing unauthenticated backtest endpoint...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/backtest/test",
            json=sample_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success!")
            print(f"Total Return: {result['total_return']}%")
            print(f"Win Rate: {result['win_rate']}%")
            print(f"Number of Trades: {result['number_of_trades']}")
            print(f"Final Portfolio Value: ${result['final_portfolio_value']}")
            print(f"Sharpe Ratio: {result['sharpe_ratio']}")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the API. Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_authenticated_backtest():
    """Test the /backtest endpoint (authentication required)"""
    print("\nTesting authenticated backtest endpoint...")
    
    # First, register a user
    user_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    try:
        # Try to register (might fail if user already exists)
        register_response = requests.post(
            f"{BASE_URL}/register",
            json=user_data,
            headers={"Content-Type": "application/json"}
        )
        
        if register_response.status_code == 200:
            token_data = register_response.json()
            access_token = token_data["access_token"]
            print("✅ User registered successfully")
        else:
            # If registration fails, try to login
            login_response = requests.post(
                f"{BASE_URL}/login",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            if login_response.status_code == 200:
                token_data = login_response.json()
                access_token = token_data["access_token"]
                print("✅ User logged in successfully")
            else:
                print(f"❌ Authentication failed: {login_response.text}")
                return
        
        # Now test the authenticated endpoint
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{BASE_URL}/backtest",
            json=sample_request,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Authenticated backtest successful!")
            print(f"Backtest ID: {result.get('backtest_id', 'N/A')}")
            print(f"Total Return: {result['total_return']}%")
            print(f"Win Rate: {result['win_rate']}%")
            print(f"Number of Trades: {result['number_of_trades']}")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the API. Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    print("Stock Backtester API Test Script")
    print("=" * 40)
    
    # Test unauthenticated endpoint first
    test_unauthenticated_backtest()
    
    # Test authenticated endpoint
    test_authenticated_backtest()
    
    print("\n" + "=" * 40)
    print("Test completed!")

if __name__ == "__main__":
    main() 