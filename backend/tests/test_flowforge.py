"""
FlowForge API Tests
Tests for the FlowForge workflow automation builder feature
"""

import pytest
import requests
import os
import time

# Get BASE_URL from environment variable
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "joshua@thcohq.com"
TEST_PASSWORD = "THCOAdmin2024!"


class TestFlowForgeHealth:
    """Health check endpoint tests"""
    
    def test_health_endpoint_returns_healthy(self):
        """Test that the FlowForge health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/flowforge/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "supabase" in data
        assert "n8n" in data
        print(f"✓ Health check passed: {data}")


class TestFlowForgeConversations:
    """Conversation endpoint tests"""
    
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
    
    def test_create_conversation(self, auth_session):
        """Test creating a new FlowForge conversation"""
        response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
            "unit": "technology"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["unit"] == "technology"
        assert data["status"] == "building"
        assert "created_at" in data
        
        print(f"✓ Created conversation: {data['id']}")
        return data["id"]
    
    def test_get_conversation(self, auth_session):
        """Test getting a conversation by ID"""
        # First create a conversation
        create_response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
            "unit": "sales"
        })
        assert create_response.status_code == 200
        conversation_id = create_response.json()["id"]
        
        # Then get it
        get_response = auth_session.get(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["id"] == conversation_id
        assert data["unit"] == "sales"
        
        print(f"✓ Retrieved conversation: {conversation_id}")
    
    def test_list_conversations(self, auth_session):
        """Test listing conversations"""
        response = auth_session.get(f"{BASE_URL}/api/flowforge/conversations")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} conversations")
    
    def test_list_conversations_by_unit(self, auth_session):
        """Test filtering conversations by unit"""
        # Create a conversation for a specific unit
        auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
            "unit": "marketing"
        })
        
        # Filter by unit
        response = auth_session.get(f"{BASE_URL}/api/flowforge/conversations?unit=marketing")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned conversations should be for the marketing unit
        for conv in data:
            assert conv["unit"] == "marketing"
        
        print(f"✓ Filtered conversations by unit: {len(data)} marketing conversations")
    
    def test_update_conversation(self, auth_session):
        """Test updating a conversation"""
        # Create a conversation
        create_response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
            "unit": "operations"
        })
        assert create_response.status_code == 200
        conversation_id = create_response.json()["id"]
        
        # Update it
        update_response = auth_session.patch(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}", json={
            "tool_name": "Test Automation Tool",
            "description": "A test automation tool"
        })
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["tool_name"] == "Test Automation Tool"
        assert data["description"] == "A test automation tool"
        
        print(f"✓ Updated conversation: {conversation_id}")


class TestFlowForgeMessages:
    """Message endpoint tests"""
    
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
    
    def test_add_message(self, auth_session, conversation_id):
        """Test adding a message to a conversation"""
        response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}/messages", json={
            "role": "user",
            "content": "I want to automate daily report generation"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["role"] == "user"
        assert data["content"] == "I want to automate daily report generation"
        assert data["conversation_id"] == conversation_id
        assert "id" in data
        assert "created_at" in data
        
        print(f"✓ Added message to conversation: {conversation_id}")
    
    def test_add_assistant_message(self, auth_session, conversation_id):
        """Test adding an assistant message"""
        response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}/messages", json={
            "role": "assistant",
            "content": "I can help you with that! What reports do you need to generate?"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "assistant"
        
        print(f"✓ Added assistant message")
    
    def test_get_messages(self, auth_session, conversation_id):
        """Test getting messages for a conversation"""
        # Add a few messages first
        auth_session.post(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}/messages", json={
            "role": "user",
            "content": "First message"
        })
        auth_session.post(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}/messages", json={
            "role": "assistant",
            "content": "Second message"
        })
        
        # Get messages
        response = auth_session.get(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}/messages")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 2
        
        # Messages should be in order by message_index
        for i in range(len(data) - 1):
            assert data[i]["message_index"] <= data[i + 1]["message_index"]
        
        print(f"✓ Retrieved {len(data)} messages")
    
    def test_message_persistence_in_supabase(self, auth_session, conversation_id):
        """Test that messages are persisted in Supabase database"""
        # Add a unique message
        test_content = f"Test message {time.time()}"
        
        add_response = auth_session.post(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}/messages", json={
            "role": "user",
            "content": test_content
        })
        
        assert add_response.status_code == 200
        message_id = add_response.json()["id"]
        
        # Retrieve messages and verify
        get_response = auth_session.get(f"{BASE_URL}/api/flowforge/conversations/{conversation_id}/messages")
        
        assert get_response.status_code == 200
        messages = get_response.json()
        
        # Find our message
        found = False
        for msg in messages:
            if msg["id"] == message_id:
                assert msg["content"] == test_content
                found = True
                break
        
        assert found, "Message not found in database"
        print(f"✓ Message persisted in Supabase: {message_id}")


class TestFlowForgeAIGeneration:
    """AI generation endpoint tests"""
    
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
    
    def test_generate_response(self, auth_session, conversation_id):
        """Test AI response generation"""
        response = auth_session.post(f"{BASE_URL}/api/flowforge/generate", json={
            "conversation_id": conversation_id,
            "message": "I need to automate sending daily reports via email",
            "include_history": True
        }, timeout=60)  # AI generation can take time
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "content" in data
        assert isinstance(data["content"], str)
        assert len(data["content"]) > 0
        assert "has_workflow" in data
        assert "workflow_data" in data
        
        print(f"✓ AI generated response: {data['content'][:100]}...")


class TestFlowForgeBuildHistory:
    """Build history / conversations listing tests"""
    
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
    
    def test_build_history_for_unit(self, auth_session):
        """Test retrieving build history for a specific unit"""
        # Create a few conversations for a unit
        for i in range(2):
            auth_session.post(f"{BASE_URL}/api/flowforge/conversations", json={
                "unit": "academy"
            })
        
        # Get history for that unit
        response = auth_session.get(f"{BASE_URL}/api/flowforge/conversations?unit=academy")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 2
        
        for conv in data:
            assert conv["unit"] == "academy"
        
        print(f"✓ Build history for academy unit: {len(data)} conversations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
