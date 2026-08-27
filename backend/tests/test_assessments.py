"""
Test suite for Candidate Assessment System
Tests: POST /api/assessments/start, PUT /api/assessments/{id}/answers, 
       PUT /api/assessments/{id}/final, GET /api/assessments/lookup,
       GET /api/assessments/admin/list, GET /api/assessments/admin/{id}
"""
import pytest
import requests
import os
# Credentials come from the environment. This file used to carry the
# super admin's real password as a literal, in a tracked file, which
# meant anybody with repository access had it.
TEST_ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', '')
TEST_ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', '')

import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = TEST_ADMIN_EMAIL
ADMIN_PASSWORD = TEST_ADMIN_PASSWORD


class TestAssessmentPublicEndpoints:
    """Public assessment endpoints - no auth required"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        self.test_name = "Test Candidate"
    
    def test_start_assessment_creates_new_record(self):
        """POST /api/assessments/start - creates new assessment"""
        response = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": self.test_name, "email": self.test_email}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["email"] == self.test_email.lower(), "Email should be lowercased"
        assert data["name"] == self.test_name
        assert data["status"] == "in_progress"
        assert "answers" in data
        assert len(data["answers"]) == 37, "Should have 37 question slots (Q1-Q37)"
        assert data["time_remaining_seconds"] == 5400, "Timer should start at 90 minutes (5400s)"
        
        # Store for cleanup
        self.assessment_id = data["id"]
        print(f"✓ Created assessment: {self.assessment_id}")
    
    def test_start_assessment_resumes_existing(self):
        """POST /api/assessments/start - returns existing assessment for same email"""
        # Create first assessment
        response1 = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": self.test_name, "email": self.test_email}
        )
        assert response1.status_code == 200
        first_id = response1.json()["id"]
        
        # Try to create with same email
        response2 = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": "Different Name", "email": self.test_email}
        )
        assert response2.status_code == 200
        second_id = response2.json()["id"]
        
        assert first_id == second_id, "Should return same assessment for same email"
        print(f"✓ Resume existing assessment works: {first_id}")
    
    def test_start_assessment_invalid_email(self):
        """POST /api/assessments/start - rejects invalid email"""
        response = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": "Test", "email": "not-an-email"}
        )
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"
        print("✓ Invalid email rejected")
    
    def test_save_answers(self):
        """PUT /api/assessments/{id}/answers - saves answers"""
        # Create assessment first
        create_resp = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": self.test_name, "email": self.test_email}
        )
        assessment_id = create_resp.json()["id"]
        
        # Save some answers
        answers = {
            "q1": "I am a passionate developer",
            "q2": "The first trillion-dollar African company that puts Africa on the global map",
            "q3": "Because I believe in Africa's potential"
        }
        response = requests.put(
            f"{BASE_URL}/api/assessments/{assessment_id}/answers",
            json={"answers": answers}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "saved"
        assert "last_saved_at" in data
        print(f"✓ Answers saved for assessment: {assessment_id}")
    
    def test_save_answers_not_found(self):
        """PUT /api/assessments/{id}/answers - returns 404 for invalid ID"""
        response = requests.put(
            f"{BASE_URL}/api/assessments/invalid-id-12345/answers",
            json={"answers": {"q1": "test"}}
        )
        assert response.status_code == 404
        print("✓ 404 returned for invalid assessment ID")
    
    def test_save_timer(self):
        """PUT /api/assessments/{id}/timer - saves timer state"""
        # Create assessment first
        create_resp = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": self.test_name, "email": self.test_email}
        )
        assessment_id = create_resp.json()["id"]
        
        # Save timer state
        response = requests.put(
            f"{BASE_URL}/api/assessments/{assessment_id}/timer",
            json={"time_remaining_seconds": 4500, "timer_started_at": "2026-01-01T00:00:00Z"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "saved"
        print(f"✓ Timer state saved for assessment: {assessment_id}")
    
    def test_save_final_details(self):
        """PUT /api/assessments/{id}/final - saves final details and marks complete"""
        # Create assessment first
        create_resp = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": self.test_name, "email": self.test_email}
        )
        assessment_id = create_resp.json()["id"]
        
        # Save final details with work_preference
        final_data = {
            "onsite_hybrid": "Yes",
            "work_preference": "Fully Onsite",
            "salary_expectation": "$5000/month",
            "location_city": "Lagos",
            "location_state": "Lagos State",
            "location_country": "Nigeria",
            "time_remaining_seconds": 3600,
            "total_time_taken_seconds": 1800
        }
        response = requests.put(
            f"{BASE_URL}/api/assessments/{assessment_id}/final",
            json=final_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "completed"
        assert "completed_at" in data
        print(f"✓ Final details saved, assessment completed: {assessment_id}")
    
    def test_save_final_details_with_hybrid_preference(self):
        """PUT /api/assessments/{id}/final - saves work_preference as Hybrid"""
        # Create assessment first
        create_resp = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": self.test_name, "email": f"hybrid_{self.test_email}"}
        )
        assessment_id = create_resp.json()["id"]
        
        # Save final details with Hybrid preference
        final_data = {
            "onsite_hybrid": "Yes",
            "work_preference": "Hybrid",
            "salary_expectation": "$6000/month",
            "location_city": "Nairobi",
            "location_state": "",
            "location_country": "Kenya",
            "time_remaining_seconds": 4000,
            "total_time_taken_seconds": 1400
        }
        response = requests.put(
            f"{BASE_URL}/api/assessments/{assessment_id}/final",
            json=final_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify work_preference is saved by fetching the assessment
        get_resp = requests.get(f"{BASE_URL}/api/assessments/by-id/{assessment_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["work_preference"] == "Hybrid", f"Expected 'Hybrid', got '{data.get('work_preference')}'"
        print(f"✓ Work preference 'Hybrid' saved correctly: {assessment_id}")
    
    def test_lookup_assessment(self):
        """GET /api/assessments/lookup - finds assessment by email"""
        # Create assessment first
        create_resp = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": self.test_name, "email": self.test_email}
        )
        assessment_id = create_resp.json()["id"]
        
        # Lookup by email
        response = requests.get(
            f"{BASE_URL}/api/assessments/lookup",
            params={"email": self.test_email}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == assessment_id
        assert data["email"] == self.test_email.lower()
        print(f"✓ Lookup by email works: {self.test_email}")
    
    def test_lookup_assessment_not_found(self):
        """GET /api/assessments/lookup - returns 404 for unknown email"""
        response = requests.get(
            f"{BASE_URL}/api/assessments/lookup",
            params={"email": "nonexistent@example.com"}
        )
        assert response.status_code == 404
        print("✓ 404 returned for unknown email")
    
    def test_get_assessment_by_id(self):
        """GET /api/assessments/by-id/{id} - gets assessment by ID"""
        # Create assessment first
        create_resp = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": self.test_name, "email": self.test_email}
        )
        assessment_id = create_resp.json()["id"]
        
        # Get by ID
        response = requests.get(f"{BASE_URL}/api/assessments/by-id/{assessment_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == assessment_id
        print(f"✓ Get by ID works: {assessment_id}")


class TestAssessmentAdminEndpoints:
    """Admin assessment endpoints - require authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        # Login as admin
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_resp.status_code != 200:
            pytest.skip(f"Admin login failed: {login_resp.status_code} - {login_resp.text}")
        
        self.test_email = f"test_admin_{uuid.uuid4().hex[:8]}@example.com"
        self.test_name = "Admin Test Candidate"
    
    def test_admin_list_assessments(self):
        """GET /api/assessments/admin/list - lists all assessments"""
        response = self.session.get(f"{BASE_URL}/api/assessments/admin/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin list returned {len(data)} assessments")
    
    def test_admin_list_filter_completed(self):
        """GET /api/assessments/admin/list - filters by completed status"""
        response = self.session.get(
            f"{BASE_URL}/api/assessments/admin/list",
            params={"status_filter": "completed"}
        )
        assert response.status_code == 200
        
        data = response.json()
        for item in data:
            assert item["status"] == "completed", f"Expected completed, got {item['status']}"
        print(f"✓ Completed filter works: {len(data)} completed assessments")
    
    def test_admin_list_filter_in_progress(self):
        """GET /api/assessments/admin/list - filters by in_progress status"""
        response = self.session.get(
            f"{BASE_URL}/api/assessments/admin/list",
            params={"status_filter": "in_progress"}
        )
        assert response.status_code == 200
        
        data = response.json()
        for item in data:
            assert item["status"] == "in_progress", f"Expected in_progress, got {item['status']}"
        print(f"✓ In-progress filter works: {len(data)} in-progress assessments")
    
    def test_admin_get_assessment_detail(self):
        """GET /api/assessments/admin/{id} - gets single assessment detail"""
        # Create an assessment first
        create_resp = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": self.test_name, "email": self.test_email}
        )
        assessment_id = create_resp.json()["id"]
        
        # Get detail as admin
        response = self.session.get(f"{BASE_URL}/api/assessments/admin/{assessment_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == assessment_id
        assert "completion_pct" in data
        assert "questions_answered" in data
        print(f"✓ Admin detail view works: {assessment_id}")
    
    def test_admin_get_assessment_not_found(self):
        """GET /api/assessments/admin/{id} - returns 404 for invalid ID"""
        response = self.session.get(f"{BASE_URL}/api/assessments/admin/invalid-id-12345")
        assert response.status_code == 404
        print("✓ 404 returned for invalid assessment ID in admin view")
    
    def test_admin_export_json(self):
        """GET /api/assessments/admin/export/json - exports completed assessments as JSON"""
        response = self.session.get(f"{BASE_URL}/api/assessments/admin/export/json")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "application/json" in response.headers.get("content-type", "")
        print("✓ JSON export works")
    
    def test_admin_export_csv(self):
        """GET /api/assessments/admin/export/csv - exports all assessments as CSV"""
        response = self.session.get(f"{BASE_URL}/api/assessments/admin/export/csv")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/csv" in response.headers.get("content-type", "")
        # Verify work_preference column is in CSV header
        csv_content = response.text
        assert "work_preference" in csv_content, "CSV should include work_preference column"
        print("✓ CSV export works with work_preference column")
    
    def test_admin_export_single(self):
        """GET /api/assessments/admin/{id}/export - exports single assessment as JSON"""
        # Create an assessment first
        create_resp = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": self.test_name, "email": self.test_email}
        )
        assessment_id = create_resp.json()["id"]
        
        response = self.session.get(f"{BASE_URL}/api/assessments/admin/{assessment_id}/export")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "application/json" in response.headers.get("content-type", "")
        print(f"✓ Single assessment export works: {assessment_id}")


class TestAssessmentAdminAuthRequired:
    """Test that admin endpoints require authentication"""
    
    def test_admin_list_requires_auth(self):
        """GET /api/assessments/admin/list - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/assessments/admin/list")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Admin list requires authentication")
    
    def test_admin_detail_requires_auth(self):
        """GET /api/assessments/admin/{id} - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/assessments/admin/some-id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Admin detail requires authentication")
    
    def test_admin_export_json_requires_auth(self):
        """GET /api/assessments/admin/export/json - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/assessments/admin/export/json")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ JSON export requires authentication")
    
    def test_admin_export_csv_requires_auth(self):
        """GET /api/assessments/admin/export/csv - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/assessments/admin/export/csv")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ CSV export requires authentication")


class TestAssessmentFullFlow:
    """End-to-end assessment flow test"""
    
    def test_complete_assessment_flow(self):
        """Full flow: start -> answer questions -> save final -> verify in admin"""
        session = requests.Session()
        test_email = f"e2e_test_{uuid.uuid4().hex[:8]}@example.com"
        test_name = "E2E Test Candidate"
        
        # Step 1: Start assessment
        start_resp = requests.post(
            f"{BASE_URL}/api/assessments/start",
            json={"name": test_name, "email": test_email}
        )
        assert start_resp.status_code == 200
        assessment = start_resp.json()
        assessment_id = assessment["id"]
        print(f"Step 1: Created assessment {assessment_id}")
        
        # Step 2: Save some answers
        answers = {
            "q1": "I am passionate about building great products",
            "q2": "The first trillion-dollar African company that puts Africa on the global map",
            "q3": "I believe in Africa's potential to lead global innovation",
            "q4": "I want to be part of something that changes the world",
            "q5": "Being part of something big means contributing to lasting impact"
        }
        answer_resp = requests.put(
            f"{BASE_URL}/api/assessments/{assessment_id}/answers",
            json={"answers": answers}
        )
        assert answer_resp.status_code == 200
        print("Step 2: Saved answers")
        
        # Step 3: Save final details with work_preference
        final_data = {
            "onsite_hybrid": "Yes",
            "work_preference": "Fully Onsite",
            "salary_expectation": "$8000/month",
            "location_city": "Nairobi",
            "location_state": "",
            "location_country": "Kenya",
            "time_remaining_seconds": 4000,
            "total_time_taken_seconds": 1400
        }
        final_resp = requests.put(
            f"{BASE_URL}/api/assessments/{assessment_id}/final",
            json=final_data
        )
        assert final_resp.status_code == 200
        assert final_resp.json()["status"] == "completed"
        print("Step 3: Submitted final details with work_preference")
        
        # Step 4: Login as admin and verify
        login_resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_resp.status_code != 200:
            pytest.skip("Admin login failed")
        
        # Step 5: Check admin list
        list_resp = session.get(f"{BASE_URL}/api/assessments/admin/list")
        assert list_resp.status_code == 200
        assessments = list_resp.json()
        found = any(a["id"] == assessment_id for a in assessments)
        assert found, f"Assessment {assessment_id} not found in admin list"
        print("Step 4: Assessment found in admin list")
        
        # Step 6: Check admin detail - verify work_preference is included
        detail_resp = session.get(f"{BASE_URL}/api/assessments/admin/{assessment_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["status"] == "completed"
        assert detail["onsite_hybrid"] == "Yes"
        assert detail["work_preference"] == "Fully Onsite", f"Expected 'Fully Onsite', got '{detail.get('work_preference')}'"
        assert detail["location_city"] == "Nairobi"
        assert detail["questions_answered"] == 5
        print("Step 5: Admin detail view correct with work_preference")
        
        print(f"✓ Full E2E flow completed successfully for {test_email}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
