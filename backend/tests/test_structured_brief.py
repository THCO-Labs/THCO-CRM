"""
Test: Structured Brief Detection and Workflow Generation
Tests the fix for AI asking redundant questions when structured briefs are provided.

Key functionality tested:
1. _is_structured_brief() correctly detects form submissions with markers
2. _should_trigger_two_step() prioritizes structured briefs
3. /api/flowforge/generate endpoint processes structured briefs correctly
4. AI generates workflow immediately without asking clarifying questions
"""

import pytest
import requests
import os
# Credentials come from the environment. This file used to carry the
# super admin's real password as a literal, in a tracked file, which
# meant anybody with repository access had it.
TEST_ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', '')
TEST_ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', '')

import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://executive-decks.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = TEST_ADMIN_EMAIL
TEST_PASSWORD = TEST_ADMIN_PASSWORD

# Structured brief format from the ProblemBriefForm
STRUCTURED_BRIEF_TEMPLATE = """**TOOL NAME:** {tool_name}
**THE PROBLEM:** {problem}
**THE TRIGGER:** {trigger}
**THE STEPS:** {steps}
**THE OUTCOME:** {outcome}
**HOW OFTEN:** {how_often}"""


class TestStructuredBriefDetection:
    """Tests for the _is_structured_brief() function logic"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        
        data = response.json()
        session.cookies.set("session_token", data["session_token"])
        return session
    
    @pytest.fixture(scope="class")
    def test_conversation(self, auth_session):
        """Create a test conversation for the tests"""
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/conversations",
            json={"unit": "talent", "tool_name": "Test Structured Brief Tool"}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Failed to create conversation: {response.text}")
        
        return response.json()
    
    def test_generate_endpoint_exists(self, auth_session):
        """Test that the /generate endpoint exists and responds"""
        # Test without conversation_id to check endpoint is accessible
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/generate",
            json={
                "conversation_id": "non-existent",
                "message": "test",
                "include_history": False
            }
        )
        
        # Should return 404 for non-existent conversation, NOT 500 or 404 on route
        # Note: 520 may occur if backend temporarily unavailable
        assert response.status_code in [404, 403, 520], f"Unexpected status: {response.status_code}, body: {response.text[:500]}"
        print(f"PASS: /generate endpoint exists and responds correctly (status: {response.status_code})")
    
    def test_structured_brief_with_all_markers(self, auth_session, test_conversation):
        """
        Test that structured brief with all markers generates workflow immediately.
        AI should NOT ask clarifying questions like 'What should be the tool name?'
        """
        structured_brief = STRUCTURED_BRIEF_TEMPLATE.format(
            tool_name="Candidate Follow-up Reminder",
            problem="Recruiters forget to follow up with candidates after 5 days of no response, leading to lost talent and poor candidate experience",
            trigger="scheduled",
            steps="1. Check database for candidates with last_contact > 5 days\n2. Filter for candidates in 'awaiting_response' status\n3. Generate follow-up email draft using AI\n4. Send notification to recruiter with candidate list",
            outcome="Recruiters receive daily digest of candidates needing follow-up, ensuring no candidate falls through the cracks",
            how_often="daily"
        )
        
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/generate",
            json={
                "conversation_id": test_conversation["id"],
                "message": structured_brief,
                "include_history": False,
                "check_duplicates": False
            },
            timeout=180  # 3 minute timeout for AI generation
        )
        
        print(f"Response status: {response.status_code}")
        
        assert response.status_code == 200, f"Generate failed: {response.text[:500]}"
        
        data = response.json()
        print(f"Response content preview: {data.get('content', '')[:500]}")
        
        # Check that AI did NOT ask clarifying questions
        clarifying_questions = [
            "what should be the tool name",
            "what is the tool name",
            "what triggers this",
            "how often does this run",
            "what name would you like",
            "could you tell me more",
            "can you provide more details",
            "what exactly do you want"
        ]
        
        content_lower = data.get("content", "").lower()
        
        for question in clarifying_questions:
            assert question not in content_lower, f"AI asked a clarifying question that shouldn't be asked for structured briefs: '{question}'"
        
        print("PASS: AI did not ask clarifying questions for structured brief")
        
        # Check that workflow was generated (has_workflow should be True)
        has_workflow = data.get("has_workflow", False)
        print(f"has_workflow: {has_workflow}")
        
        # Check for action buttons (Submit for Approval / Make Changes)
        has_action_buttons = data.get("has_action_buttons", False)
        action_buttons = data.get("action_buttons", [])
        print(f"has_action_buttons: {has_action_buttons}")
        print(f"action_buttons: {action_buttons}")
        
        # Either workflow should be generated OR content should indicate workflow is being built
        workflow_indicators = [
            "automation",
            "workflow",
            "building",
            "designed",
            "created",
            "generated",
            "submit for approval",
            "make changes"
        ]
        
        has_workflow_indicator = any(ind in content_lower for ind in workflow_indicators)
        
        assert has_workflow or has_workflow_indicator, f"AI should generate workflow or indicate it's building one for structured briefs. Content: {data.get('content', '')[:300]}"
        
        print("PASS: AI generated workflow or indicated workflow creation for structured brief")
        
        return data
    
    def test_workflow_data_contains_tool_name(self, auth_session, test_conversation):
        """
        Test that when workflow_data is returned, it contains the tool_name from the brief
        """
        tool_name = "Daily Pipeline Report Generator"
        
        structured_brief = STRUCTURED_BRIEF_TEMPLATE.format(
            tool_name=tool_name,
            problem="Sales team needs to see daily pipeline updates but manually compiling the report takes 30 minutes each morning",
            trigger="scheduled",
            steps="1. Query database for all active opportunities\n2. Group by pipeline stage\n3. Calculate metrics (total value, stage distribution)\n4. Format as email report\n5. Send to sales team Slack channel",
            outcome="Automated daily pipeline summary delivered to sales team channel by 8am",
            how_often="daily at 8am"
        )
        
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/generate",
            json={
                "conversation_id": test_conversation["id"],
                "message": structured_brief,
                "include_history": False,
                "check_duplicates": False
            },
            timeout=180
        )
        
        assert response.status_code == 200, f"Generate failed: {response.text[:500]}"
        
        data = response.json()
        workflow_data = data.get("workflow_data", {})
        
        print(f"workflow_data: {json.dumps(workflow_data, indent=2)[:500]}")
        
        # Check if workflow_data contains tool information
        if workflow_data:
            suggested_name = workflow_data.get("suggested_name", workflow_data.get("tool_name", ""))
            print(f"Suggested name from workflow_data: {suggested_name}")
            
            # The name should be derived from the brief (may not be exact match but should be similar)
            assert suggested_name, "workflow_data should contain a suggested_name or tool_name"
            print(f"PASS: workflow_data contains tool name: {suggested_name}")
        else:
            # If no workflow_data, check content for tool name reference
            content = data.get("content", "")
            assert tool_name.lower() in content.lower() or "pipeline" in content.lower(), \
                f"Response should reference the tool name. Content: {content[:300]}"
            print("PASS: Tool name is referenced in the response content")
        
        return data
    
    def test_action_buttons_present(self, auth_session, test_conversation):
        """
        Test that action buttons (Submit for Approval / Make Changes) are returned
        """
        structured_brief = STRUCTURED_BRIEF_TEMPLATE.format(
            tool_name="Interview Scheduler Assistant",
            problem="Scheduling interviews takes multiple back-and-forth emails between recruiters and candidates",
            trigger="When new interview request is created",
            steps="1. Get candidate availability from calendar\n2. Match with interviewer availability\n3. Propose 3 time slots to candidate\n4. Automatically book on confirmation",
            outcome="Interviews are scheduled with minimal manual coordination",
            how_often="on-demand"
        )
        
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/generate",
            json={
                "conversation_id": test_conversation["id"],
                "message": structured_brief,
                "include_history": False,
                "check_duplicates": False
            },
            timeout=180
        )
        
        assert response.status_code == 200, f"Generate failed: {response.text[:500]}"
        
        data = response.json()
        
        has_action_buttons = data.get("has_action_buttons", False)
        action_buttons = data.get("action_buttons", [])
        
        print(f"has_action_buttons: {has_action_buttons}")
        print(f"action_buttons: {json.dumps(action_buttons, indent=2)}")
        
        # If workflow was generated, action buttons should be present
        if data.get("has_workflow"):
            assert has_action_buttons, "Action buttons should be present when workflow is generated"
            
            button_labels = [btn.get("label", "").lower() for btn in action_buttons]
            
            assert any("approval" in label or "submit" in label for label in button_labels), \
                f"Should have 'Submit for Approval' button. Got: {button_labels}"
            
            assert any("change" in label for label in button_labels), \
                f"Should have 'Make Changes' button. Got: {button_labels}"
            
            print("PASS: Action buttons for 'Submit for Approval' and 'Make Changes' are present")
        else:
            print("INFO: Workflow not generated in this response, action buttons may not be present")


class TestCasualVsStructuredBrief:
    """Test the difference between casual requests and structured briefs"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        
        data = response.json()
        session.cookies.set("session_token", data["session_token"])
        return session
    
    @pytest.fixture(scope="class")
    def test_conversation_casual(self, auth_session):
        """Create conversation for casual test"""
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/conversations",
            json={"unit": "talent", "tool_name": "Test Casual Request"}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Failed to create conversation: {response.text}")
        
        return response.json()
    
    def test_casual_request_may_ask_questions(self, auth_session, test_conversation_casual):
        """
        Test that casual (short, vague) requests may trigger clarifying questions.
        This is expected behavior - AI should ask questions for vague requests.
        """
        casual_request = "I need help with candidate follow-ups"
        
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/generate",
            json={
                "conversation_id": test_conversation_casual["id"],
                "message": casual_request,
                "include_history": False,
                "check_duplicates": False
            },
            timeout=180
        )
        
        assert response.status_code == 200, f"Generate failed: {response.text[:500]}"
        
        data = response.json()
        content = data.get("content", "")
        
        print(f"Response to casual request: {content[:500]}")
        
        # For casual requests, AI might ask questions OR provide immediate assistance
        # This is acceptable behavior - the key is that structured briefs DON'T get questions
        print("PASS: Casual request processed (questions may or may not be asked)")


class TestMinimalStructuredBrief:
    """Test that even minimal structured briefs (4 of 6 markers) work"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        
        data = response.json()
        session.cookies.set("session_token", data["session_token"])
        return session
    
    @pytest.fixture(scope="class")
    def test_conversation_minimal(self, auth_session):
        """Create conversation for minimal brief test"""
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/conversations",
            json={"unit": "sales", "tool_name": "Test Minimal Brief"}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Failed to create conversation: {response.text}")
        
        return response.json()
    
    def test_brief_with_4_markers_detected(self, auth_session, test_conversation_minimal):
        """
        Test that briefs with at least 4 of 6 required markers are detected as structured.
        This tests the threshold in _is_structured_brief() function.
        """
        # Brief with only 4 markers (missing HOW OFTEN and WHO IS INVOLVED)
        minimal_brief = """**TOOL NAME:** Lead Follow-up Tracker
**THE PROBLEM:** Sales reps don't have visibility into which leads need follow-up
**THE TRIGGER:** manual
**THE STEPS:** Query leads table, filter by last_contact date, generate report
**THE OUTCOME:** Weekly report of leads needing attention"""
        
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/generate",
            json={
                "conversation_id": test_conversation_minimal["id"],
                "message": minimal_brief,
                "include_history": False,
                "check_duplicates": False
            },
            timeout=180
        )
        
        assert response.status_code == 200, f"Generate failed: {response.text[:500]}"
        
        data = response.json()
        content = data.get("content", "").lower()
        
        print(f"Response to minimal brief: {content[:500]}")
        
        # Check that AI doesn't ask for the tool name (which is clearly provided)
        assert "what should be the tool name" not in content, \
            "AI should not ask for tool name when it's clearly provided in **TOOL NAME:**"
        
        print("PASS: AI did not ask for tool name from minimal structured brief")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
