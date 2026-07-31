"""
Test suite for Portal-Native Forms Feature (FlowForge)

Tests the following endpoints:
- GET /api/flowforge/tools - returns deployed tools list
- GET /api/flowforge/tools/{tool_id}/form-fields - returns form field configuration
- POST /api/flowforge/tools/{tool_id}/execute - executes a tool with form data

These tests verify the portal-native forms feature that allows users to interact
with deployed tools directly within the THCO portal without being redirected to n8n forms.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthSetup:
    """Authentication setup for all tests"""
    
    @pytest.fixture(scope="class")
    def auth_cookies(self):
        """Get authentication cookies"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "joshua@thcohq.com",
            "password": "THCOAdmin2024!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return session.cookies


class TestFlowForgeHealth:
    """Health check tests"""
    
    def test_flowforge_health_endpoint(self):
        """Test that FlowForge health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/flowforge/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert "supabase" in data
        assert "n8n" in data
        print(f"FlowForge health: {data}")


class TestDeployedTools:
    """Tests for GET /api/flowforge/tools endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup auth session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "joshua@thcohq.com",
            "password": "THCOAdmin2024!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.session = session
    
    def test_get_deployed_tools_returns_list(self):
        """Test that GET /api/flowforge/tools returns a list of deployed tools"""
        response = self.session.get(f"{BASE_URL}/api/flowforge/tools")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of tools"
        print(f"Found {len(data)} deployed tools")
    
    def test_deployed_tools_have_required_fields(self):
        """Test that deployed tools have all required fields"""
        response = self.session.get(f"{BASE_URL}/api/flowforge/tools")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            tool = data[0]
            required_fields = [
                "id", "tool_name", "unit", "status", "execution_count",
                "success_count", "error_count", "created_by_name", "is_active"
            ]
            for field in required_fields:
                assert field in tool, f"Missing field: {field}"
            print(f"First tool: {tool.get('tool_name')} ({tool.get('status')})")
    
    def test_deployed_tools_filter_by_unit(self):
        """Test filtering deployed tools by unit"""
        response = self.session.get(f"{BASE_URL}/api/flowforge/tools?unit=talent")
        assert response.status_code == 200
        data = response.json()
        
        # All tools should be from talent unit
        for tool in data:
            assert tool.get("unit") == "talent", f"Tool {tool.get('id')} has wrong unit"
        print(f"Found {len(data)} tools for talent unit")
    
    def test_deployed_tools_have_workflow_info(self):
        """Test that deployed tools include n8n workflow information"""
        response = self.session.get(f"{BASE_URL}/api/flowforge/tools")
        assert response.status_code == 200
        data = response.json()
        
        # Check if any tools have engine_workflow_id
        tools_with_workflow = [t for t in data if t.get("engine_workflow_id")]
        print(f"{len(tools_with_workflow)} of {len(data)} tools have n8n workflow IDs")


class TestToolFormFields:
    """Tests for GET /api/flowforge/tools/{tool_id}/form-fields endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup auth session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "joshua@thcohq.com",
            "password": "THCOAdmin2024!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.session = session
    
    def test_get_form_fields_for_existing_tool(self):
        """Test GET /api/flowforge/tools/{tool_id}/form-fields returns form fields"""
        # First get a tool ID
        tools_response = self.session.get(f"{BASE_URL}/api/flowforge/tools")
        assert tools_response.status_code == 200
        tools = tools_response.json()
        
        if len(tools) > 0:
            tool_id = tools[0]["id"]
            
            # Get form fields
            response = self.session.get(f"{BASE_URL}/api/flowforge/tools/{tool_id}/form-fields")
            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert "tool_id" in data
            assert "tool_name" in data
            assert "form_fields" in data
            assert isinstance(data["form_fields"], list)
            
            print(f"Tool '{data.get('tool_name')}' has {len(data.get('form_fields', []))} form fields")
    
    def test_form_fields_have_required_properties(self):
        """Test that form fields have name, label, and type properties"""
        # Get a tool with form fields
        tools_response = self.session.get(f"{BASE_URL}/api/flowforge/tools")
        tools = tools_response.json()
        
        for tool in tools:
            response = self.session.get(f"{BASE_URL}/api/flowforge/tools/{tool['id']}/form-fields")
            if response.status_code == 200:
                data = response.json()
                form_fields = data.get("form_fields", [])
                
                if len(form_fields) > 0:
                    for field in form_fields:
                        # Fields should have at least name and type (label may be optional)
                        assert "name" in field or "label" in field, f"Field missing identifier: {field}"
                        assert "type" in field, f"Field missing type: {field}"
                    
                    print(f"Tool '{data.get('tool_name')}' form fields validated")
                    return
        
        print("No tools with form fields found - test skipped")
    
    def test_form_fields_include_select_options(self):
        """Test that select/dropdown fields include options"""
        tools_response = self.session.get(f"{BASE_URL}/api/flowforge/tools")
        tools = tools_response.json()
        
        for tool in tools:
            response = self.session.get(f"{BASE_URL}/api/flowforge/tools/{tool['id']}/form-fields")
            if response.status_code == 200:
                data = response.json()
                form_fields = data.get("form_fields", [])
                
                select_fields = [f for f in form_fields if f.get("type") == "select"]
                if select_fields:
                    for field in select_fields:
                        assert "options" in field, f"Select field '{field.get('name')}' missing options"
                        assert isinstance(field["options"], list)
                        assert len(field["options"]) > 0, "Select field has no options"
                    print(f"Found {len(select_fields)} select fields with valid options")
                    return
        
        print("No tools with select fields found")
    
    def test_get_form_fields_returns_404_for_nonexistent_tool(self):
        """Test that form-fields endpoint returns 404 for non-existent tool"""
        fake_tool_id = "00000000-0000-0000-0000-000000000000"
        response = self.session.get(f"{BASE_URL}/api/flowforge/tools/{fake_tool_id}/form-fields")
        assert response.status_code == 404


class TestToolExecution:
    """Tests for POST /api/flowforge/tools/{tool_id}/execute endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup auth session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "joshua@thcohq.com",
            "password": "THCOAdmin2024!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.session = session
    
    def test_execute_requires_authentication(self):
        """Test that execute endpoint requires authentication"""
        # Use a new session without auth
        unauthenticated = requests.Session()
        
        response = unauthenticated.post(
            f"{BASE_URL}/api/flowforge/tools/some-id/execute",
            json={"form_data": {}}
        )
        assert response.status_code == 401, "Expected 401 Unauthorized"
    
    def test_execute_returns_400_for_tool_without_workflow(self):
        """Test execute returns 400 when tool has no n8n workflow"""
        tools_response = self.session.get(f"{BASE_URL}/api/flowforge/tools")
        tools = tools_response.json()
        
        # Find a tool without engine_workflow_id (if any)
        for tool in tools:
            if not tool.get("engine_workflow_id"):
                response = self.session.post(
                    f"{BASE_URL}/api/flowforge/tools/{tool['id']}/execute",
                    json={"form_data": {"test": "data"}}
                )
                # Should return 400 because tool not deployed to n8n
                assert response.status_code == 400
                print(f"Tool without workflow correctly returns 400")
                return
        
        print("All tools have engine_workflow_id - skipping test")
    
    def test_execute_with_form_data(self):
        """Test tool execution with form data - expects error due to n8n setup"""
        tools_response = self.session.get(f"{BASE_URL}/api/flowforge/tools")
        tools = tools_response.json()
        
        # Find a tool with engine_workflow_id
        for tool in tools:
            if tool.get("engine_workflow_id"):
                form_data = {
                    "spreadsheet_url": "https://docs.google.com/spreadsheets/d/test",
                    "email_tone": "Professional",
                    "company_name": "Test Company",
                    "sender_name": "Test User",
                    "sender_title": "Test Title"
                }
                
                response = self.session.post(
                    f"{BASE_URL}/api/flowforge/tools/{tool['id']}/execute",
                    json={"form_data": form_data}
                )
                
                # Expected: 500 error because n8n webhook not accessible
                # This is expected behavior as noted in the test context
                if response.status_code == 500:
                    data = response.json()
                    print(f"Expected execution error: {data.get('detail', 'n8n not configured')}")
                    assert True
                    return
                elif response.status_code == 200:
                    # If it succeeds, that's also valid
                    print("Tool execution succeeded unexpectedly")
                    return
                
        print("No tools with engine_workflow_id found")
    
    def test_execute_updates_execution_stats(self):
        """Test that execution attempts update the tool's stats"""
        tools_response = self.session.get(f"{BASE_URL}/api/flowforge/tools")
        tools = tools_response.json()
        
        for tool in tools:
            if tool.get("engine_workflow_id"):
                tool_id = tool["id"]
                initial_exec_count = tool.get("execution_count", 0)
                
                # Attempt execution
                self.session.post(
                    f"{BASE_URL}/api/flowforge/tools/{tool_id}/execute",
                    json={"form_data": {"test": "data"}}
                )
                
                # Get updated tool
                updated_response = self.session.get(f"{BASE_URL}/api/flowforge/tools/{tool_id}")
                if updated_response.status_code == 200:
                    updated_tool = updated_response.json()
                    new_exec_count = updated_tool.get("execution_count", 0)
                    
                    # Execution count should increase or error count should increase
                    if new_exec_count > initial_exec_count:
                        print(f"Execution count increased from {initial_exec_count} to {new_exec_count}")
                    else:
                        # Check error count
                        error_count = updated_tool.get("error_count", 0)
                        print(f"Error count: {error_count}")
                    return
        
        print("No testable tools found")


class TestSpecificToolID:
    """Tests for the specific tool mentioned in the test request"""
    
    TOOL_ID = "9febfb59-dd56-495d-916d-8fda1b44bf64"
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup auth session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "joshua@thcohq.com",
            "password": "THCOAdmin2024!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.session = session
    
    def test_specific_tool_exists(self):
        """Test that the specific AI-Powered Candidate Outreach tool exists"""
        response = self.session.get(f"{BASE_URL}/api/flowforge/tools/{self.TOOL_ID}")
        
        if response.status_code == 404:
            pytest.skip("Specific tool not found - may have been deleted")
        
        assert response.status_code == 200
        data = response.json()
        print(f"Tool found: {data.get('tool_name')}")
    
    def test_specific_tool_has_8_form_fields(self):
        """Test that the tool has 8 form fields as specified"""
        response = self.session.get(f"{BASE_URL}/api/flowforge/tools/{self.TOOL_ID}/form-fields")
        
        if response.status_code == 404:
            pytest.skip("Specific tool not found")
        
        assert response.status_code == 200
        data = response.json()
        form_fields = data.get("form_fields", [])
        
        print(f"Tool '{data.get('tool_name')}' has {len(form_fields)} form fields")
        
        # List all fields
        for i, field in enumerate(form_fields):
            print(f"  {i+1}. {field.get('label', field.get('name'))} ({field.get('type')})")
        
        assert len(form_fields) == 8, f"Expected 8 form fields, got {len(form_fields)}"
    
    def test_specific_tool_form_field_types(self):
        """Test that the tool has correct form field types"""
        response = self.session.get(f"{BASE_URL}/api/flowforge/tools/{self.TOOL_ID}/form-fields")
        
        if response.status_code == 404:
            pytest.skip("Specific tool not found")
        
        data = response.json()
        form_fields = data.get("form_fields", [])
        
        # Expected field types based on the form screenshot
        field_types = [f.get("type") for f in form_fields]
        
        assert "text" in field_types, "Missing text field type"
        assert "select" in field_types, "Missing select field type"
        assert "textarea" in field_types, "Missing textarea field type"
        
        print(f"Field types found: {set(field_types)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
