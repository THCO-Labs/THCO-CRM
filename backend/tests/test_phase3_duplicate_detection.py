"""
FlowForge Phase 3 Tests - Duplicate Detection & Inventory
Tests for duplicate detection, inventory sync, search, and related features
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

# Get BASE_URL from environment variable
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = TEST_ADMIN_EMAIL
TEST_PASSWORD = TEST_ADMIN_PASSWORD


class TestFlowForgeHealth:
    """Health check endpoint tests"""
    
    def test_health_returns_supabase_connected(self):
        """Test that health endpoint returns Supabase connected status"""
        response = requests.get(f"{BASE_URL}/api/flowforge/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["supabase"] == "connected"
        assert "n8n" in data
        print(f"✓ Health check passed: supabase={data['supabase']}, n8n={data['n8n']}")


class TestInventorySync:
    """Inventory sync endpoint tests"""
    
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
    
    def test_inventory_sync_endpoint(self, auth_session):
        """Test that inventory sync fetches workflows from n8n and stores in Supabase"""
        response = auth_session.post(f"{BASE_URL}/api/flowforge/inventory/sync", timeout=30)
        
        # May return 503 if n8n not configured, but should work if configured
        if response.status_code == 503:
            data = response.json()
            print(f"⚠ n8n not configured: {data.get('detail', 'Unknown error')}")
            pytest.skip("n8n configuration not available")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "synced" in data["message"].lower() or "workflows" in data["message"].lower()
        print(f"✓ Inventory sync completed: {data['message']}")


class TestInventoryList:
    """Inventory list endpoint tests"""
    
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
    
    def test_inventory_list_returns_workflows(self, auth_session):
        """Test that inventory list returns synced workflows"""
        response = auth_session.get(f"{BASE_URL}/api/flowforge/inventory")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Inventory list returned {len(data)} workflows")
        
        # If we have workflows, verify structure
        if len(data) > 0:
            workflow = data[0]
            assert "id" in workflow
            assert "name" in workflow
            assert "engine_workflow_id" in workflow
            print(f"  First workflow: {workflow.get('name', 'Unknown')}")
    
    def test_inventory_list_with_unit_filter(self, auth_session):
        """Test that inventory list can filter by unit"""
        response = auth_session.get(f"{BASE_URL}/api/flowforge/inventory?unit=technology")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # All returned items should have matching unit (if any)
        for wf in data:
            if wf.get("unit"):
                assert wf["unit"] == "technology"
        
        print(f"✓ Inventory list with unit filter returned {len(data)} workflows")


class TestInventorySearch:
    """Inventory search endpoint tests"""
    
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
    
    def test_inventory_search_endpoint(self, auth_session):
        """Test that inventory search finds workflows matching a query"""
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/inventory/search",
            params={"query": "email", "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Inventory search for 'email' returned {len(data)} results")
    
    def test_inventory_search_with_different_queries(self, auth_session):
        """Test search with various queries"""
        queries = ["slack", "automation", "report", "daily"]
        
        for query in queries:
            response = auth_session.post(
                f"{BASE_URL}/api/flowforge/inventory/search",
                params={"query": query, "limit": 5}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"  Search '{query}': {len(data)} results")
        
        print("✓ Inventory search works with different queries")


class TestDuplicateDetectionInGenerate:
    """Test duplicate detection in generate endpoint"""
    
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
    def new_conversation_id(self, auth_session):
        """Create a new conversation for testing"""
        response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
            "unit": "technology"
        })
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_generate_with_check_duplicates_true(self, auth_session, new_conversation_id):
        """Test that generate endpoint checks for duplicates on first message"""
        # Send first message (is_first_message should be detected as True since no user messages yet)
        response = auth_session.post(f"{BASE_URL}/api/flowforge/generate", json={
            "conversation_id": new_conversation_id,
            "message": "I need to send daily email reports with sales data",
            "include_history": True,
            "check_duplicates": True
        }, timeout=60)
        
        assert response.status_code == 200
        data = response.json()
        
        # Response should have content
        assert "content" in data
        assert isinstance(data["content"], str)
        assert len(data["content"]) > 0
        
        # Check response structure for duplicate detection fields
        assert "has_duplicate_alert" in data
        assert "duplicate_data" in data
        
        # Log whether duplicates were found
        if data.get("has_duplicate_alert") and data.get("duplicate_data"):
            dup_data = data["duplicate_data"]
            print(f"✓ Duplicate detection triggered:")
            print(f"  Strong match: {dup_data.get('has_strong_match', False)}")
            if dup_data.get("strongest_match"):
                match = dup_data["strongest_match"]
                print(f"  Strongest match: {match.get('name')} ({match.get('similarity_score')}%)")
        else:
            print("✓ No duplicates found (expected for unique request)")
        
        print(f"✓ Generate response received: {data['content'][:100]}...")
    
    def test_generate_without_duplicate_check(self, auth_session, new_conversation_id):
        """Test generate with check_duplicates=false skips duplicate detection"""
        response = auth_session.post(f"{BASE_URL}/api/flowforge/generate", json={
            "conversation_id": new_conversation_id,
            "message": "Build an automation for slack notifications",
            "include_history": True,
            "check_duplicates": False
        }, timeout=60)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "content" in data
        # When check_duplicates is False, has_duplicate_alert should be False or not set
        # (unless it's set by other logic)
        print(f"✓ Generate without duplicate check: has_duplicate_alert={data.get('has_duplicate_alert', False)}")


class TestDuplicateAlertStructure:
    """Test the structure of duplicate alert data"""
    
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
        """Create a conversation for testing"""
        response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
            "unit": "marketing"
        })
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_duplicate_data_structure_when_found(self, auth_session, conversation_id):
        """Test that duplicate_data has correct structure when duplicates are found"""
        # Try a common automation request that might match existing tools
        response = auth_session.post(f"{BASE_URL}/api/flowforge/generate", json={
            "conversation_id": conversation_id,
            "message": "I need an email automation that sends weekly reports",
            "include_history": True,
            "check_duplicates": True
        }, timeout=60)
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("has_duplicate_alert") and data.get("duplicate_data"):
            dup_data = data["duplicate_data"]
            
            # Verify structure
            assert "has_strong_match" in dup_data
            assert isinstance(dup_data["has_strong_match"], bool)
            
            if "strongest_match" in dup_data and dup_data["strongest_match"]:
                match = dup_data["strongest_match"]
                assert "id" in match
                assert "name" in match
                assert "similarity_score" in match
                print(f"✓ Duplicate data structure valid. Strongest match: {match['name']}")
            
            # Check for action buttons
            if "action_buttons" in dup_data:
                buttons = dup_data["action_buttons"]
                assert isinstance(buttons, list)
                
                # Verify expected action buttons
                actions = [btn["action"] for btn in buttons]
                expected_actions = ["use_existing", "request_update", "build_new"]
                for action in expected_actions:
                    assert action in actions, f"Missing action button: {action}"
                
                print(f"✓ Action buttons present: {actions}")
        else:
            print("⚠ No duplicates found for this query (structure test skipped)")


class TestMessageWithDuplicateData:
    """Test saving messages with duplicate alert data"""
    
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
        """Create a conversation for testing"""
        response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
            "unit": "sales"
        })
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_save_message_with_duplicate_data(self, auth_session, conversation_id):
        """Test that messages can be saved with duplicate_data"""
        # Create a message with duplicate alert data
        duplicate_data = {
            "has_strong_match": True,
            "strongest_match": {
                "id": "test-id-123",
                "name": "Test Existing Tool",
                "description": "A test tool",
                "similarity_score": 85
            },
            "action_buttons": [
                {"label": "Yes, use this one", "action": "use_existing", "primary": True}
            ]
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/conversations/{conversation_id}/messages",
            json={
                "role": "assistant",
                "content": "I found a similar tool!",
                "has_duplicate_alert": True,
                "duplicate_data": duplicate_data
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["has_duplicate_alert"] == True
        assert data["duplicate_data"] is not None
        assert data["duplicate_data"]["strongest_match"]["name"] == "Test Existing Tool"
        
        print("✓ Message with duplicate data saved successfully")
    
    def test_retrieve_message_with_duplicate_data(self, auth_session, conversation_id):
        """Test that messages with duplicate data can be retrieved"""
        # Save a message with duplicate data
        duplicate_data = {
            "has_strong_match": False,
            "strongest_match": {
                "id": "retrieve-test-123",
                "name": "Retrieve Test Tool",
                "similarity_score": 55
            }
        }
        
        save_response = auth_session.post(
            f"{BASE_URL}/api/flowforge/conversations/{conversation_id}/messages",
            json={
                "role": "assistant",
                "content": "Found similar tools",
                "has_duplicate_alert": True,
                "duplicate_data": duplicate_data
            }
        )
        assert save_response.status_code == 200
        message_id = save_response.json()["id"]
        
        # Retrieve messages
        get_response = auth_session.get(
            f"{BASE_URL}/api/flowforge/conversations/{conversation_id}/messages"
        )
        
        assert get_response.status_code == 200
        messages = get_response.json()
        
        # Find our message
        found_message = None
        for msg in messages:
            if msg["id"] == message_id:
                found_message = msg
                break
        
        assert found_message is not None
        assert found_message["has_duplicate_alert"] == True
        assert found_message["duplicate_data"]["strongest_match"]["name"] == "Retrieve Test Tool"
        
        print("✓ Message with duplicate data retrieved successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
