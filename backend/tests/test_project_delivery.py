"""
Test suite for Project Delivery Workflow feature.
Tests: Projects CRUD, Delegation, Review, Tracker, Notifications Badge, Pipeline, Engineer Workload
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
TEST_CLIENT_ID = "client_9ec725d83dc6"  # Acme Corporation


class TestAuthAndSetup:
    """Authentication and setup tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Get authentication token for super admin"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        return data["session_token"]
    
    def test_login_success(self, session, auth_token):
        """Test login with super admin credentials"""
        assert auth_token is not None
        assert auth_token.startswith("session_")
        print(f"Login successful, token: {auth_token[:20]}...")
    
    def test_auth_me_returns_user_with_roles(self, session, auth_token):
        """Test /auth/me returns user with is_engineer, is_fulfillment, is_hr flags"""
        response = session.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "is_engineer" in data
        assert "is_fulfillment" in data
        assert "is_hr" in data
        print(f"User: {data['email']}, is_engineer={data['is_engineer']}, is_fulfillment={data['is_fulfillment']}, is_hr={data['is_hr']}")


class TestUserManagement:
    """User management tests for role toggles"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["session_token"]
    
    def test_get_users_list(self, session, auth_token):
        """Test GET /users returns list with role flags"""
        response = session.get(f"{BASE_URL}/api/users", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        # Check first user has expected fields
        user = users[0]
        assert "user_id" in user
        assert "email" in user
        assert "name" in user
        print(f"Found {len(users)} users")


class TestProjectsAPI:
    """Project CRUD and workflow tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["session_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_list_projects(self, session, headers):
        """Test GET /projects returns project list"""
        response = session.get(f"{BASE_URL}/api/projects", headers=headers)
        assert response.status_code == 200
        projects = response.json()
        assert isinstance(projects, list)
        print(f"Found {len(projects)} projects")
        if projects:
            p = projects[0]
            assert "id" in p
            assert "name" in p
            assert "status" in p
            assert "client_name_snapshot" in p
            print(f"First project: {p['name']} - {p['status']}")
    
    def test_get_project_pipeline(self, session, headers):
        """Test GET /projects/pipeline returns status counts"""
        response = session.get(f"{BASE_URL}/api/projects/pipeline", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"Pipeline counts: {data}")
    
    def test_get_engineer_workload(self, session, headers):
        """Test GET /projects/engineers/workload returns engineer list with workload"""
        response = session.get(f"{BASE_URL}/api/projects/engineers/workload", headers=headers)
        assert response.status_code == 200
        engineers = response.json()
        assert isinstance(engineers, list)
        print(f"Found {len(engineers)} engineers")
        if engineers:
            eng = engineers[0]
            assert "user_id" in eng
            assert "name" in eng
            assert "workload_status" in eng
            assert "active_project_count" in eng
            print(f"Engineer: {eng['name']} - {eng['workload_status']} ({eng['active_project_count']} active)")
    
    def test_get_notifications_badge(self, session, headers):
        """Test GET /notifications/badge returns badge counts"""
        response = session.get(f"{BASE_URL}/api/notifications/badge", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "total" in data
        print(f"Notification badges: {data}")


class TestProjectCreation:
    """Test project creation with file uploads"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["session_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_project_with_files(self, session, headers):
        """Test POST /projects creates project with multipart form data"""
        unique_id = uuid.uuid4().hex[:8]
        project_name = f"TEST_Project_{unique_id}"
        
        # Create dummy PDF content
        brief_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
        roadmap_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
        
        files = {
            'brief': ('brief.pdf', brief_content, 'application/pdf'),
            'roadmap': ('roadmap.pdf', roadmap_content, 'application/pdf'),
        }
        data = {
            'name': project_name,
            'client_id': TEST_CLIENT_ID,
            'description': 'Test project created by automated tests',
        }
        
        response = session.post(
            f"{BASE_URL}/api/projects",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Create project failed: {response.text}"
        project = response.json()
        assert "id" in project
        assert project["name"] == project_name
        assert project["status"] == "awaiting_delegation"
        assert project["client_id"] == TEST_CLIENT_ID
        assert "brief_document_url" in project
        assert "roadmap_document_url" in project
        print(f"Created project: {project['id']} - {project['name']}")
        
        # Store project ID for later tests
        TestProjectCreation.created_project_id = project["id"]
        return project["id"]
    
    def test_get_created_project(self, session, headers):
        """Test GET /projects/{id} returns created project"""
        project_id = getattr(TestProjectCreation, 'created_project_id', None)
        if not project_id:
            pytest.skip("No project created in previous test")
        
        response = session.get(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
        assert response.status_code == 200
        project = response.json()
        assert project["id"] == project_id
        assert project["status"] == "awaiting_delegation"
        print(f"Retrieved project: {project['name']}")


class TestProjectDelegation:
    """Test project delegation workflow"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["session_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def user_info(self, session, auth_token):
        """Get current user info"""
        response = session.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        return response.json()
    
    def test_delegate_project(self, session, headers, user_info):
        """Test POST /projects/{id}/delegate assigns to engineer"""
        # First create a project
        unique_id = uuid.uuid4().hex[:8]
        brief_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
        
        files = {
            'brief': ('brief.pdf', brief_content, 'application/pdf'),
            'roadmap': ('roadmap.pdf', brief_content, 'application/pdf'),
        }
        data = {
            'name': f"TEST_Delegate_{unique_id}",
            'client_id': TEST_CLIENT_ID,
            'description': 'Test delegation',
        }
        
        create_response = session.post(
            f"{BASE_URL}/api/projects",
            headers=headers,
            files=files,
            data=data
        )
        assert create_response.status_code == 200
        project = create_response.json()
        project_id = project["id"]
        
        # Delegate to self (user has is_engineer=true)
        delegate_response = session.post(
            f"{BASE_URL}/api/projects/{project_id}/delegate",
            headers=headers,
            json={
                "engineer_id": user_info["user_id"],
                "note": "Test delegation note"
            }
        )
        
        assert delegate_response.status_code == 200, f"Delegation failed: {delegate_response.text}"
        result = delegate_response.json()
        assert "message" in result
        assert "review" in result
        print(f"Delegated project {project_id} to {user_info['name']}")
        
        # Verify project status changed
        get_response = session.get(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
        assert get_response.status_code == 200
        updated_project = get_response.json()
        assert updated_project["status"] == "delegated"
        assert updated_project["assigned_engineer_id"] == user_info["user_id"]
        
        TestProjectDelegation.delegated_project_id = project_id
        return project_id


class TestProjectReview:
    """Test project review workflow"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["session_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def user_info(self, session, auth_token):
        response = session.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        return response.json()
    
    def test_open_review(self, session, headers, user_info):
        """Test POST /projects/{id}/review/open marks review as opened"""
        # Create and delegate a project first
        unique_id = uuid.uuid4().hex[:8]
        brief_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
        
        files = {
            'brief': ('brief.pdf', brief_content, 'application/pdf'),
            'roadmap': ('roadmap.pdf', brief_content, 'application/pdf'),
        }
        data = {
            'name': f"TEST_Review_{unique_id}",
            'client_id': TEST_CLIENT_ID,
        }
        
        create_response = session.post(f"{BASE_URL}/api/projects", headers=headers, files=files, data=data)
        project_id = create_response.json()["id"]
        
        # Delegate
        session.post(f"{BASE_URL}/api/projects/{project_id}/delegate", headers=headers, json={
            "engineer_id": user_info["user_id"]
        })
        
        # Open review
        open_response = session.post(f"{BASE_URL}/api/projects/{project_id}/review/open", headers=headers)
        assert open_response.status_code == 200
        result = open_response.json()
        assert "first_opened_at" in result
        print(f"Opened review for project {project_id}")
        
        # Verify status changed to under_review
        get_response = session.get(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
        assert get_response.json()["status"] == "under_review"
        
        TestProjectReview.review_project_id = project_id
        return project_id
    
    def test_submit_approval_decision(self, session, headers, user_info):
        """Test POST /projects/{id}/review/decision approves project"""
        # Create, delegate, and open a project
        unique_id = uuid.uuid4().hex[:8]
        brief_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
        
        files = {
            'brief': ('brief.pdf', brief_content, 'application/pdf'),
            'roadmap': ('roadmap.pdf', brief_content, 'application/pdf'),
        }
        data = {'name': f"TEST_Approve_{unique_id}", 'client_id': TEST_CLIENT_ID}
        
        create_response = session.post(f"{BASE_URL}/api/projects", headers=headers, files=files, data=data)
        project_id = create_response.json()["id"]
        
        session.post(f"{BASE_URL}/api/projects/{project_id}/delegate", headers=headers, json={
            "engineer_id": user_info["user_id"]
        })
        session.post(f"{BASE_URL}/api/projects/{project_id}/review/open", headers=headers)
        
        # Submit approval
        decision_response = session.post(f"{BASE_URL}/api/projects/{project_id}/review/decision", headers=headers, json={
            "prd_approved": True,
            "roadmap_approved": True,
            "notes": "Looks good!"
        })
        
        assert decision_response.status_code == 200
        result = decision_response.json()
        assert result["status"] == "approved_for_build"
        print(f"Approved project {project_id}")
        
        TestProjectReview.approved_project_id = project_id
        return project_id


class TestProjectTracker:
    """Test project tracker/standup workflow"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["session_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def user_info(self, session, auth_token):
        response = session.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        return response.json()
    
    def test_start_build(self, session, headers, user_info):
        """Test POST /projects/{id}/start-build transitions to in_build"""
        # Create full workflow: create -> delegate -> open -> approve
        unique_id = uuid.uuid4().hex[:8]
        brief_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
        
        files = {
            'brief': ('brief.pdf', brief_content, 'application/pdf'),
            'roadmap': ('roadmap.pdf', brief_content, 'application/pdf'),
        }
        data = {'name': f"TEST_Build_{unique_id}", 'client_id': TEST_CLIENT_ID}
        
        create_response = session.post(f"{BASE_URL}/api/projects", headers=headers, files=files, data=data)
        project_id = create_response.json()["id"]
        
        session.post(f"{BASE_URL}/api/projects/{project_id}/delegate", headers=headers, json={
            "engineer_id": user_info["user_id"]
        })
        session.post(f"{BASE_URL}/api/projects/{project_id}/review/open", headers=headers)
        session.post(f"{BASE_URL}/api/projects/{project_id}/review/decision", headers=headers, json={
            "prd_approved": True, "roadmap_approved": True
        })
        
        # Start build
        start_response = session.post(f"{BASE_URL}/api/projects/{project_id}/start-build", headers=headers)
        assert start_response.status_code == 200
        result = start_response.json()
        assert result["status"] == "in_build"
        print(f"Started build for project {project_id}")
        
        TestProjectTracker.build_project_id = project_id
        return project_id
    
    def test_submit_tracker_standup(self, session, headers, user_info):
        """Test POST /projects/{id}/tracker submits daily standup"""
        project_id = getattr(TestProjectTracker, 'build_project_id', None)
        if not project_id:
            # Create one
            unique_id = uuid.uuid4().hex[:8]
            brief_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
            
            files = {
                'brief': ('brief.pdf', brief_content, 'application/pdf'),
                'roadmap': ('roadmap.pdf', brief_content, 'application/pdf'),
            }
            data = {'name': f"TEST_Tracker_{unique_id}", 'client_id': TEST_CLIENT_ID}
            
            create_response = session.post(f"{BASE_URL}/api/projects", headers=headers, files=files, data=data)
            project_id = create_response.json()["id"]
            
            session.post(f"{BASE_URL}/api/projects/{project_id}/delegate", headers=headers, json={
                "engineer_id": user_info["user_id"]
            })
            session.post(f"{BASE_URL}/api/projects/{project_id}/review/open", headers=headers)
            session.post(f"{BASE_URL}/api/projects/{project_id}/review/decision", headers=headers, json={
                "prd_approved": True, "roadmap_approved": True
            })
            session.post(f"{BASE_URL}/api/projects/{project_id}/start-build", headers=headers)
        
        # Submit standup
        tracker_response = session.post(f"{BASE_URL}/api/projects/{project_id}/tracker", headers=headers, json={
            "yesterday": "Completed initial setup and database schema",
            "today": "Working on API endpoints and frontend integration",
            "blockers": None,
            "percent_complete": 25,
            "status": "on_track",
            "eta": "2026-02-15"
        })
        
        assert tracker_response.status_code == 200
        result = tracker_response.json()
        assert "update_date" in result
        print(f"Submitted standup for project {project_id}")
    
    def test_get_tracker_history(self, session, headers, user_info):
        """Test GET /projects/{id}/tracker returns standup history"""
        project_id = getattr(TestProjectTracker, 'build_project_id', None)
        if not project_id:
            pytest.skip("No build project available")
        
        response = session.get(f"{BASE_URL}/api/projects/{project_id}/tracker", headers=headers)
        assert response.status_code == 200
        history = response.json()
        assert isinstance(history, list)
        print(f"Tracker history has {len(history)} entries")
        if history:
            entry = history[0]
            assert "yesterday" in entry
            assert "today" in entry
            assert "percent_complete" in entry


class TestProjectCompletion:
    """Test project completion workflow"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["session_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def user_info(self, session, auth_token):
        response = session.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        return response.json()
    
    def test_complete_project(self, session, headers, user_info):
        """Test POST /projects/{id}/complete marks project as completed"""
        # Full workflow
        unique_id = uuid.uuid4().hex[:8]
        brief_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
        
        files = {
            'brief': ('brief.pdf', brief_content, 'application/pdf'),
            'roadmap': ('roadmap.pdf', brief_content, 'application/pdf'),
        }
        data = {'name': f"TEST_Complete_{unique_id}", 'client_id': TEST_CLIENT_ID}
        
        create_response = session.post(f"{BASE_URL}/api/projects", headers=headers, files=files, data=data)
        project_id = create_response.json()["id"]
        
        session.post(f"{BASE_URL}/api/projects/{project_id}/delegate", headers=headers, json={
            "engineer_id": user_info["user_id"]
        })
        session.post(f"{BASE_URL}/api/projects/{project_id}/review/open", headers=headers)
        session.post(f"{BASE_URL}/api/projects/{project_id}/review/decision", headers=headers, json={
            "prd_approved": True, "roadmap_approved": True
        })
        session.post(f"{BASE_URL}/api/projects/{project_id}/start-build", headers=headers)
        
        # Complete project
        complete_response = session.post(f"{BASE_URL}/api/projects/{project_id}/complete", headers=headers)
        assert complete_response.status_code == 200
        result = complete_response.json()
        assert result["status"] == "completed"
        print(f"Completed project {project_id}")
        
        # Verify
        get_response = session.get(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
        assert get_response.json()["status"] == "completed"
        assert get_response.json()["completed_at"] is not None


class TestErrorHandling:
    """Test error handling and edge cases"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["session_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_nonexistent_project(self, session, headers):
        """Test GET /projects/{id} returns 404 for invalid ID"""
        response = session.get(f"{BASE_URL}/api/projects/nonexistent-id-12345", headers=headers)
        assert response.status_code == 404
    
    def test_delegate_nonexistent_project(self, session, headers):
        """Test POST /projects/{id}/delegate returns 404 for invalid project"""
        response = session.post(f"{BASE_URL}/api/projects/nonexistent-id/delegate", headers=headers, json={
            "engineer_id": "some-user-id"
        })
        assert response.status_code == 404
    
    def test_unauthenticated_access(self):
        """Test endpoints require authentication"""
        # Use a fresh session without any auth
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 401
        
        response = fresh_session.get(f"{BASE_URL}/api/notifications/badge")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
