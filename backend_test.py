import requests
import sys
from datetime import datetime
import json
import os
# Credentials come from the environment. This file used to carry the
# super admin's real password as a literal, in a tracked file, which
# meant anybody with repository access had it.
TEST_ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', '')
TEST_ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', '')


class THCOPortalTester:
    def __init__(self, base_url="https://executive-decks.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_credentials = {
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_admin_login(self):
        """Test login with seeded admin credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=self.admin_credentials
        )
        if success and 'session_token' in response:
            self.session_token = response['session_token']
            print(f"   Logged in as: {response.get('name')} ({response.get('role')})")
            return True
        return False

    def test_get_me(self):
        """Test getting current user info"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)

    def test_get_users(self):
        """Test getting all users (admin only)"""
        return self.run_test("Get All Users", "GET", "users", 200)

    def test_create_user(self):
        """Test creating a new user"""
        test_user_data = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"testuser{datetime.now().strftime('%H%M%S')}@thcohq.com",
            "role": "team_member",
            "accessible_units": ["talent"]
        }
        success, response = self.run_test(
            "Create User",
            "POST",
            "users",
            200,
            data=test_user_data
        )
        if success:
            print(f"   Created user with temp password: {response.get('temp_password')}")
            return True, response.get('user_id')
        return False, None

    def test_sourcing_request(self):
        """Test creating a sourcing request"""
        sourcing_data = {
            "job_title": "Test Senior Developer",
            "job_description": "We are looking for a senior developer with 5+ years of experience in Python and React.",
            "company_name": "Test Company",
            "company_website": "https://testcompany.com",
            "company_location": "Lagos, Nigeria",
            "hiring_locations": "Lagos, Remote",
            "salary_budget": "$80,000 - $120,000",
            "target_companies": "Google, Microsoft, Meta",
            "companies_to_exclude": "Competitor Corp",
            "accept_n_minus_one": "Yes — accept one level below with matching experience",
            "industry_segments": "Technology, Software",
            "additional_notes": "Looking for candidates with startup experience",
            "assigned_recruiter": "Test Recruiter"
        }
        success, response = self.run_test(
            "Create Sourcing Request",
            "POST",
            "sourcing-requests",
            200,
            data=sourcing_data
        )
        if success:
            print(f"   Created sourcing request: {response.get('request_id')}")
            return True, response.get('request_id')
        return False, None

    def test_get_sourcing_requests(self):
        """Test getting sourcing requests"""
        return self.run_test("Get Sourcing Requests", "GET", "sourcing-requests", 200)

    def test_database_search(self):
        """Test creating a database search"""
        search_data = {
            "job_title": "Test Data Scientist",
            "job_description": "Looking for a data scientist with machine learning experience.",
            "company_context": "Fintech startup, 50 employees, Series A",
            "seniority_level": "Senior (5-8 years)",
            "max_candidates": "25 (Standard)"
        }
        success, response = self.run_test(
            "Create Database Search",
            "POST",
            "database-searches",
            200,
            data=search_data
        )
        if success:
            print(f"   Created database search: {response.get('search_id')}")
            return True, response.get('search_id')
        return False, None

    def test_get_database_searches(self):
        """Test getting database searches"""
        return self.run_test("Get Database Searches", "GET", "database-searches", 200)

    def test_webhooks_settings(self):
        """Test webhook settings endpoints"""
        # Get webhooks
        success, _ = self.run_test("Get Webhooks", "GET", "settings/webhooks", 200)
        if not success:
            return False
        
        # Update webhooks
        webhook_data = {
            "sourcing_webhook_url": "https://test-webhook.com/sourcing",
            "database_search_webhook_url": "https://test-webhook.com/database"
        }
        return self.run_test(
            "Update Webhooks",
            "PUT",
            "settings/webhooks",
            200,
            data=webhook_data
        )

    def test_activity_logs(self):
        """Test activity logs endpoint"""
        return self.run_test("Get Activity Logs", "GET", "activity-logs", 200)

    def test_logout(self):
        """Test logout functionality"""
        return self.run_test("Logout", "POST", "auth/logout", 200)

def main():
    print("🚀 Starting THCO Portal Backend API Tests")
    print("=" * 50)
    
    tester = THCOPortalTester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Admin Login", tester.test_admin_login),
        ("Get Current User", tester.test_get_me),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Get Users", tester.test_get_users),
        ("Create User", lambda: tester.test_create_user()[0]),
        ("Create Sourcing Request", lambda: tester.test_sourcing_request()[0]),
        ("Get Sourcing Requests", tester.test_get_sourcing_requests),
        ("Create Database Search", lambda: tester.test_database_search()[0]),
        ("Get Database Searches", tester.test_get_database_searches),
        ("Webhook Settings", tester.test_webhooks_settings),
        ("Activity Logs", tester.test_activity_logs),
        ("Logout", tester.test_logout),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            if not success:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
            tester.tests_run += 1
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print("\n🎉 All tests passed!")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())