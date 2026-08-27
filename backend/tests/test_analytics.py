"""
Analytics API Tests
Tests for user analytics and logging system endpoints
"""
import pytest
import requests
import os
# Credentials come from the environment. This file used to carry the
# super admin's real password as a literal, in a tracked file, which
# meant anybody with repository access had it.
TEST_ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', '')
TEST_ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', '')


BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAnalyticsEndpoints:
    """Test analytics API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        # Store cookies for authenticated requests
        self.cookies = login_response.cookies
        
    def test_analytics_summary(self):
        """Test GET /api/analytics/summary - Get analytics summary"""
        response = self.session.get(
            f"{BASE_URL}/api/analytics/summary?days=30",
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "total_users" in data
        assert "active_users_today" in data
        assert "active_users_week" in data
        assert "total_sessions" in data
        assert "avg_session_duration" in data
        assert "total_page_views" in data
        assert "most_visited_pages" in data
        assert "user_actions_summary" in data
        assert "device_breakdown" in data
        assert "browser_breakdown" in data
        assert "period_days" in data
        
        # Verify data types
        assert isinstance(data["total_users"], int)
        assert isinstance(data["total_sessions"], int)
        assert isinstance(data["most_visited_pages"], list)
        print(f"Analytics summary: {data['total_users']} users, {data['total_sessions']} sessions, {data['total_page_views']} page views")
        
    def test_analytics_users(self):
        """Test GET /api/analytics/users - Get user analytics"""
        response = self.session.get(
            f"{BASE_URL}/api/analytics/users?days=30&limit=50",
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            user = data[0]
            # Verify user analytics structure
            assert "user_id" in user
            assert "name" in user
            assert "email" in user
            assert "total_sessions" in user
            assert "total_time_minutes" in user
            assert "total_pages_viewed" in user
            assert "total_actions" in user
            print(f"Found {len(data)} users with analytics data")
        else:
            print("No user analytics data found (expected if no activity)")
            
    def test_analytics_sessions(self):
        """Test GET /api/analytics/sessions - Get session history"""
        response = self.session.get(
            f"{BASE_URL}/api/analytics/sessions?days=7&limit=50",
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            session = data[0]
            # Verify session structure
            assert "session_id" in session
            assert "user_id" in session
            assert "user_name" in session
            assert "started_at" in session
            print(f"Found {len(data)} sessions")
        else:
            print("No sessions found (expected if no recent activity)")
            
    def test_analytics_page_views(self):
        """Test GET /api/analytics/page-views - Get page view analytics"""
        response = self.session.get(
            f"{BASE_URL}/api/analytics/page-views?days=7",
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "daily_views" in data
        assert "hourly_views" in data
        assert isinstance(data["daily_views"], list)
        assert isinstance(data["hourly_views"], list)
        print(f"Page views: {len(data['daily_views'])} days of data")
        
    def test_analytics_actions(self):
        """Test GET /api/analytics/actions - Get user action analytics"""
        response = self.session.get(
            f"{BASE_URL}/api/analytics/actions?days=7&limit=50",
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "recent_actions" in data
        assert "actions_by_type" in data
        assert "actions_by_target" in data
        assert isinstance(data["recent_actions"], list)
        print(f"Actions: {len(data['recent_actions'])} recent actions")
        
    def test_track_page_view(self):
        """Test POST /api/analytics/page-view - Track a page view"""
        response = self.session.post(
            f"{BASE_URL}/api/analytics/page-view",
            json={
                "page_path": "/test-page",
                "page_title": "Test Page",
                "referrer": ""
            },
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("status") in ["tracked", "skipped"]
        print(f"Page view tracking: {data.get('status')}")
        
    def test_track_action(self):
        """Test POST /api/analytics/action - Track a user action"""
        response = self.session.post(
            f"{BASE_URL}/api/analytics/action",
            json={
                "action_type": "click",
                "action_target": "test_button",
                "action_details": {"test": True},
                "page_path": "/test-page"
            },
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("status") in ["tracked", "skipped"]
        print(f"Action tracking: {data.get('status')}")
        
    def test_session_start(self):
        """Test POST /api/analytics/session/start - Start analytics session"""
        response = self.session.post(
            f"{BASE_URL}/api/analytics/session/start",
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "session_id" in data
        print(f"Session started: {data.get('session_id')}")
        return data.get("session_id")
        
    def test_session_end(self):
        """Test POST /api/analytics/session/end - End analytics session"""
        response = self.session.post(
            f"{BASE_URL}/api/analytics/session/end",
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("status") in ["ended", "skipped"]
        print(f"Session end: {data.get('status')}")
        
    def test_session_heartbeat(self):
        """Test POST /api/analytics/heartbeat - Session heartbeat"""
        # First start a session
        start_response = self.session.post(
            f"{BASE_URL}/api/analytics/session/start",
            cookies=self.cookies
        )
        session_id = start_response.json().get("session_id")
        
        # Send heartbeat
        response = self.session.post(
            f"{BASE_URL}/api/analytics/heartbeat",
            json={
                "session_id": session_id,
                "page_path": "/dashboard",
                "time_on_page": 30
            },
            cookies=self.cookies
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("status") in ["updated", "skipped"]
        print(f"Heartbeat: {data.get('status')}")
        
    def test_user_details(self):
        """Test GET /api/analytics/user/{user_id} - Get single user analytics"""
        # First get users to find a user_id
        users_response = self.session.get(
            f"{BASE_URL}/api/analytics/users?days=30&limit=1",
            cookies=self.cookies
        )
        users = users_response.json()
        
        if len(users) > 0:
            user_id = users[0]["user_id"]
            response = self.session.get(
                f"{BASE_URL}/api/analytics/user/{user_id}?days=30",
                cookies=self.cookies
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            
            data = response.json()
            # Verify response structure
            assert "user" in data
            assert "summary" in data
            assert "sessions" in data
            assert "page_breakdown" in data
            print(f"User details retrieved for: {data['user'].get('name')}")
        else:
            pytest.skip("No users found to test user details endpoint")
            
    def test_analytics_requires_admin(self):
        """Test that analytics endpoints require admin access"""
        # Create a new session without auth
        unauthenticated_session = requests.Session()
        
        response = unauthenticated_session.get(f"{BASE_URL}/api/analytics/summary")
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("Analytics endpoints correctly require authentication")


class TestAnalyticsTimeRanges:
    """Test analytics with different time ranges"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        self.cookies = login_response.cookies
        
    def test_summary_7_days(self):
        """Test analytics summary for 7 days"""
        response = self.session.get(
            f"{BASE_URL}/api/analytics/summary?days=7",
            cookies=self.cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period_days"] == 7
        print(f"7-day summary: {data['total_page_views']} page views")
        
    def test_summary_14_days(self):
        """Test analytics summary for 14 days"""
        response = self.session.get(
            f"{BASE_URL}/api/analytics/summary?days=14",
            cookies=self.cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period_days"] == 14
        print(f"14-day summary: {data['total_page_views']} page views")
        
    def test_summary_90_days(self):
        """Test analytics summary for 90 days"""
        response = self.session.get(
            f"{BASE_URL}/api/analytics/summary?days=90",
            cookies=self.cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period_days"] == 90
        print(f"90-day summary: {data['total_page_views']} page views")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
