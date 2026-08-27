"""
FlowForge Phase 2 - Approval System Tests
Tests for approval queue, stats, actions, and workflow integration
"""

import pytest
import requests
import os
# Credentials come from the environment. This file used to carry the
# super admin's real password as a literal, in a tracked file, which
# meant anybody with repository access had it.
TEST_ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', '')
TEST_ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', '')

import time
import uuid

# Get BASE_URL from environment variable
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = TEST_ADMIN_EMAIL
TEST_PASSWORD = TEST_ADMIN_PASSWORD


class TestApprovalStats:
    """Approval statistics endpoint tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        print(f"✓ Authenticated as {TEST_EMAIL}")
        return session
    
    def test_approval_stats_endpoint(self, auth_session):
        """Test that approval stats endpoint returns correct counts"""
        response = auth_session.get(f"{BASE_URL}/api/flowforge/approvals/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "pending" in data, "Missing 'pending' in stats"
        assert "approved" in data, "Missing 'approved' in stats"
        assert "rejected" in data, "Missing 'rejected' in stats"
        assert "changes_requested" in data, "Missing 'changes_requested' in stats"
        assert "total" in data, "Missing 'total' in stats"
        
        # Verify values are integers
        assert isinstance(data["pending"], int)
        assert isinstance(data["approved"], int)
        assert isinstance(data["rejected"], int)
        assert isinstance(data["changes_requested"], int)
        assert isinstance(data["total"], int)
        
        # Verify total is sum of all
        expected_total = data["pending"] + data["approved"] + data["rejected"] + data["changes_requested"]
        assert data["total"] == expected_total, f"Total mismatch: {data['total']} != {expected_total}"
        
        print(f"✓ Approval stats: pending={data['pending']}, approved={data['approved']}, rejected={data['rejected']}, changes={data['changes_requested']}, total={data['total']}")


class TestApprovalListing:
    """Approval listing endpoint tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        return session
    
    def test_list_approvals(self, auth_session):
        """Test listing all approvals"""
        response = auth_session.get(f"{BASE_URL}/api/flowforge/approvals")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} approvals")
        
        # If there are approvals, verify structure
        if len(data) > 0:
            approval = data[0]
            assert "id" in approval
            assert "conversation_id" in approval
            assert "request_type" in approval
            assert "requested_by" in approval
            assert "requested_by_name" in approval
            assert "unit" in approval
            assert "tool_name" in approval
            assert "request_summary" in approval
            assert "status" in approval
            assert "created_at" in approval
            print(f"✓ Approval structure verified: {approval['tool_name']} ({approval['status']})")
    
    def test_filter_approvals_by_status(self, auth_session):
        """Test filtering approvals by status"""
        # Test pending filter
        response = auth_session.get(f"{BASE_URL}/api/flowforge/approvals?status=pending")
        
        assert response.status_code == 200
        data = response.json()
        
        for approval in data:
            assert approval["status"] == "pending", f"Expected pending, got {approval['status']}"
        
        print(f"✓ Filtered by status=pending: {len(data)} approvals")
    
    def test_filter_approvals_by_unit(self, auth_session):
        """Test filtering approvals by unit"""
        response = auth_session.get(f"{BASE_URL}/api/flowforge/approvals?unit=talent")
        
        assert response.status_code == 200
        data = response.json()
        
        for approval in data:
            assert approval["unit"] == "talent", f"Expected talent, got {approval['unit']}"
        
        print(f"✓ Filtered by unit=talent: {len(data)} approvals")


class TestCreateApproval:
    """Approval creation endpoint tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        return session
    
    @pytest.fixture
    def conversation_id(self, auth_session):
        """Create a test conversation and return its ID"""
        response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
            "unit": "technology"
        })
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_create_approval_request(self, auth_session, conversation_id):
        """Test creating a new approval request"""
        unique_name = f"TEST_AutomationTool_{uuid.uuid4().hex[:8]}"
        
        approval_data = {
            "conversation_id": conversation_id,
            "request_type": "new_tool",
            "tool_name": unique_name,
            "request_summary": "Automated testing tool for daily report generation",
            "request_details": {
                "steps": [
                    {"step_number": 1, "name": "Fetch data", "description": "Get data from API"},
                    {"step_number": 2, "name": "Process data", "description": "Transform data"},
                    {"step_number": 3, "name": "Send report", "description": "Email report"}
                ],
                "trigger_type": "scheduled",
                "trigger_description": "Daily at 9am"
            },
            "proposed_workflow_json": {
                "nodes": [
                    {"id": "1", "type": "trigger", "name": "Schedule Trigger"},
                    {"id": "2", "type": "http", "name": "Fetch Data"},
                    {"id": "3", "type": "email", "name": "Send Email"}
                ]
            },
            "impact_assessment": {
                "risk": "LOW",
                "estimated_impact": "Save 2 hours per day"
            }
        }
        
        response = auth_session.post(f"{BASE_URL}/api/flowforge/approvals", json=approval_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response
        assert data["conversation_id"] == conversation_id
        assert data["request_type"] == "new_tool"
        assert data["tool_name"] == unique_name
        assert data["status"] == "pending"
        assert "id" in data
        assert "created_at" in data
        
        print(f"✓ Created approval request: {data['id']} for {unique_name}")
        return data["id"]
    
    def test_approval_updates_conversation_status(self, auth_session, conversation_id):
        """Test that creating an approval updates conversation status to pending_approval"""
        unique_name = f"TEST_StatusTool_{uuid.uuid4().hex[:8]}"
        
        # Create approval
        approval_data = {
            "conversation_id": conversation_id,
            "request_type": "new_tool",
            "tool_name": unique_name,
            "request_summary": "Test tool for status verification",
            "request_details": {}
        }
        
        response = auth_session.post(f"{BASE_URL}/api/flowforge/approvals", json=approval_data)
        assert response.status_code == 200
        
        # Verify conversation status was updated
        conv_response = auth_session.get(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}")
        assert conv_response.status_code == 200
        
        conv_data = conv_response.json()
        assert conv_data["status"] == "pending_approval", f"Expected pending_approval, got {conv_data['status']}"
        
        print(f"✓ Conversation status updated to pending_approval")


class TestApprovalActions:
    """Approval action (approve/reject/request_changes) tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        return session
    
    @pytest.fixture
    def pending_approval(self, auth_session):
        """Create a conversation and approval request, return approval ID"""
        # Create conversation
        conv_response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
            "unit": "operations"
        })
        assert conv_response.status_code == 200
        conversation_id = conv_response.json()["id"]
        
        # Create approval
        unique_name = f"TEST_ActionTool_{uuid.uuid4().hex[:8]}"
        approval_response = auth_session.post(f"{BASE_URL}/api/flowforge/approvals", json={
            "conversation_id": conversation_id,
            "request_type": "new_tool",
            "tool_name": unique_name,
            "request_summary": "Test tool for action testing",
            "request_details": {}
        })
        assert approval_response.status_code == 200
        
        return {
            "approval_id": approval_response.json()["id"],
            "conversation_id": conversation_id,
            "tool_name": unique_name
        }
    
    def test_approve_request(self, auth_session, pending_approval):
        """Test approving an approval request"""
        approval_id = pending_approval["approval_id"]
        
        response = auth_session.post(f"{BASE_URL}/api/flowforge/approvals/{approval_id}/action", json={
            "action": "approve",
            "note": "Looks good, approved!"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "approved"
        assert "message" in data
        
        # Verify approval status changed
        get_response = auth_session.get(f"{BASE_URL}/api/flowforge/approvals/{approval_id}")
        assert get_response.status_code == 200
        approval_data = get_response.json()
        assert approval_data["status"] == "approved"
        assert approval_data["decided_by_name"] is not None
        assert approval_data["decided_at"] is not None
        
        # Verify conversation status changed to deployed
        conv_response = auth_session.get(f"{BASE_URL}/api/flowforge/conversations/{pending_approval['conversation_id']}")
        assert conv_response.status_code == 200
        conv_data = conv_response.json()
        assert conv_data["status"] == "deployed"
        
        print(f"✓ Approved request {approval_id}, conversation status now: deployed")
    
    def test_reject_request(self, auth_session, pending_approval):
        """Test rejecting an approval request"""
        approval_id = pending_approval["approval_id"]
        
        response = auth_session.post(f"{BASE_URL}/api/flowforge/approvals/{approval_id}/action", json={
            "action": "reject",
            "note": "This duplicates existing functionality"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "rejected"
        
        # Verify approval status changed
        get_response = auth_session.get(f"{BASE_URL}/api/flowforge/approvals/{approval_id}")
        approval_data = get_response.json()
        assert approval_data["status"] == "rejected"
        assert approval_data["decision_note"] == "This duplicates existing functionality"
        
        # Verify conversation status changed back to building
        conv_response = auth_session.get(f"{BASE_URL}/api/flowforge/conversations/{pending_approval['conversation_id']}")
        conv_data = conv_response.json()
        assert conv_data["status"] == "building"
        
        print(f"✓ Rejected request {approval_id}")
    
    def test_request_changes(self, auth_session, pending_approval):
        """Test requesting changes on an approval request"""
        approval_id = pending_approval["approval_id"]
        
        response = auth_session.post(f"{BASE_URL}/api/flowforge/approvals/{approval_id}/action", json={
            "action": "request_changes",
            "note": "Please add error handling for the email step"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "changes_requested"
        
        # Verify conversation status changed
        conv_response = auth_session.get(f"{BASE_URL}/api/flowforge/conversations/{pending_approval['conversation_id']}")
        conv_data = conv_response.json()
        assert conv_data["status"] == "changes_requested"
        
        print(f"✓ Requested changes for {approval_id}")
    
    def test_cannot_process_already_processed_approval(self, auth_session, pending_approval):
        """Test that already processed approvals cannot be processed again"""
        approval_id = pending_approval["approval_id"]
        
        # First approve
        first_response = auth_session.post(f"{BASE_URL}/api/flowforge/approvals/{approval_id}/action", json={
            "action": "approve"
        })
        assert first_response.status_code == 200
        
        # Try to reject (should fail)
        second_response = auth_session.post(f"{BASE_URL}/api/flowforge/approvals/{approval_id}/action", json={
            "action": "reject",
            "note": "Trying to reject after approval"
        })
        
        assert second_response.status_code == 400, f"Expected 400, got {second_response.status_code}"
        
        print(f"✓ Correctly prevented double-processing of approval {approval_id}")


class TestGetApproval:
    """Get single approval endpoint tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        return session
    
    def test_get_approval_by_id(self, auth_session):
        """Test getting a specific approval by ID"""
        # Create a conversation and approval first
        conv_response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
            "unit": "sales"
        })
        assert conv_response.status_code == 200
        conversation_id = conv_response.json()["id"]
        
        unique_name = f"TEST_GetTool_{uuid.uuid4().hex[:8]}"
        approval_response = auth_session.post(f"{BASE_URL}/api/flowforge/approvals", json={
            "conversation_id": conversation_id,
            "request_type": "new_tool",
            "tool_name": unique_name,
            "request_summary": "Test tool for get endpoint",
            "request_details": {"key": "value"}
        })
        assert approval_response.status_code == 200
        approval_id = approval_response.json()["id"]
        
        # Get the approval
        get_response = auth_session.get(f"{BASE_URL}/api/flowforge/approvals/{approval_id}")
        
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data["id"] == approval_id
        assert data["conversation_id"] == conversation_id
        assert data["tool_name"] == unique_name
        assert data["request_details"]["key"] == "value"
        
        print(f"✓ Retrieved approval {approval_id}")
    
    def test_get_nonexistent_approval(self, auth_session):
        """Test getting a non-existent approval returns 404"""
        fake_id = str(uuid.uuid4())
        response = auth_session.get(f"{BASE_URL}/api/flowforge/approvals/{fake_id}")
        
        assert response.status_code == 404
        print(f"✓ Correctly returned 404 for non-existent approval")


class TestApprovalIntegration:
    """End-to-end approval workflow integration tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        return session
    
    def test_full_approval_workflow(self, auth_session):
        """Test the complete approval workflow: create conversation -> AI generates -> submit approval -> approve"""
        
        # Step 1: Create conversation
        conv_response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
            "unit": "marketing"
        })
        assert conv_response.status_code == 200
        conversation_id = conv_response.json()["id"]
        print(f"✓ Step 1: Created conversation {conversation_id}")
        
        # Step 2: Add user message
        msg_response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}/messages", json={
            "role": "user",
            "content": "I need to automate social media posting"
        })
        assert msg_response.status_code == 200
        print(f"✓ Step 2: Added user message")
        
        # Step 3: Get stats before
        stats_before = auth_session.get(f"{BASE_URL}/api/flowforge/approvals/stats").json()
        pending_before = stats_before["pending"]
        
        # Step 4: Submit for approval
        unique_name = f"TEST_SocialMediaPoster_{uuid.uuid4().hex[:8]}"
        approval_response = auth_session.post(f"{BASE_URL}/api/flowforge/approvals", json={
            "conversation_id": conversation_id,
            "request_type": "new_tool",
            "tool_name": unique_name,
            "request_summary": "Automated social media posting tool",
            "request_details": {
                "steps": [
                    {"step_number": 1, "name": "Schedule post"},
                    {"step_number": 2, "name": "Post to Twitter"},
                    {"step_number": 3, "name": "Post to LinkedIn"}
                ]
            }
        })
        assert approval_response.status_code == 200
        approval_id = approval_response.json()["id"]
        print(f"✓ Step 3: Created approval {approval_id}")
        
        # Step 5: Verify stats updated
        stats_after = auth_session.get(f"{BASE_URL}/api/flowforge/approvals/stats").json()
        assert stats_after["pending"] == pending_before + 1, "Pending count should increase by 1"
        print(f"✓ Step 4: Stats updated (pending: {pending_before} -> {stats_after['pending']})")
        
        # Step 6: Verify approval appears in queue
        queue_response = auth_session.get(f"{BASE_URL}/api/flowforge/approvals?status=pending")
        assert queue_response.status_code == 200
        queue_data = queue_response.json()
        found = any(a["id"] == approval_id for a in queue_data)
        assert found, "Approval should appear in pending queue"
        print(f"✓ Step 5: Approval appears in queue")
        
        # Step 7: Approve the request
        approve_response = auth_session.post(f"{BASE_URL}/api/flowforge/approvals/{approval_id}/action", json={
            "action": "approve",
            "note": "Approved via automated test"
        })
        assert approve_response.status_code == 200
        print(f"✓ Step 6: Approved request")
        
        # Step 8: Verify final states
        final_approval = auth_session.get(f"{BASE_URL}/api/flowforge/approvals/{approval_id}").json()
        assert final_approval["status"] == "approved"
        
        final_conv = auth_session.get(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}").json()
        assert final_conv["status"] == "deployed"
        
        final_stats = auth_session.get(f"{BASE_URL}/api/flowforge/approvals/stats").json()
        assert final_stats["pending"] == pending_before  # Back to original pending count
        
        print(f"✓ Step 7: Final verification complete - approval status: {final_approval['status']}, conversation status: {final_conv['status']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
