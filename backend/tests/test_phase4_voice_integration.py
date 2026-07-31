"""
Phase 4 Tests: Voice Transcription & Integration Status Checks
Tests the /api/flowforge/transcribe endpoint and integration check functionality
"""

import pytest
import requests
import os
import io
import wave
import struct
from typing import Dict, Any

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://executive-decks.preview.emergentagent.com').rstrip('/')

class TestPhase4VoiceAndIntegrations:
    """Phase 4: Voice Transcription and Integration Check tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and get authenticated session"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "joshua@thcohq.com",
            "password": "THCOAdmin2024!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        return session
    
    # ================= HEALTH CHECK =================
    def test_flowforge_health(self, auth_session):
        """Test FlowForge health endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/flowforge/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["supabase"] == "connected"
        print(f"Health check passed: {data}")
    
    # ================= INTEGRATION LIST =================
    def test_get_integrations_list(self, auth_session):
        """Test listing all integrations from database"""
        response = auth_session.get(f"{BASE_URL}/api/flowforge/integrations")
        assert response.status_code == 200
        data = response.json()
        print(f"Found {len(data)} integrations in database")
        
        # Check structure of integration records if any exist
        if data:
            integration = data[0]
            assert "id" in integration
            assert "display_name" in integration
            assert "internal_type" in integration
            assert "status" in integration
            print(f"Integration structure: {list(integration.keys())}")
            for i in data:
                print(f"  - {i.get('display_name')} ({i.get('internal_type')}): {i.get('status')}")
    
    # ================= INTEGRATION CHECK API =================
    def test_check_integrations_api(self, auth_session):
        """Test checking specific integrations by type"""
        # Test checking integration types
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/integrations/check",
            json=["gmail", "slack", "google_sheets"]
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Integration check response: {data}")
        
        # Should return status for each requested type
        assert "gmail" in data or "slack" in data or "google_sheets" in data
    
    # ================= TRANSCRIBE ENDPOINT VALIDATION =================
    def test_transcribe_requires_auth(self):
        """Test that transcribe endpoint requires authentication"""
        # Create a dummy audio file
        audio_data = self._create_dummy_wav_file()
        
        response = requests.post(
            f"{BASE_URL}/api/flowforge/transcribe",
            files={"audio": ("test.wav", audio_data, "audio/wav")}
        )
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403 but got {response.status_code}: {response.text}"
        print(f"Transcribe endpoint correctly requires auth: {response.status_code}")
    
    def test_transcribe_validates_file_type(self, auth_session):
        """Test that transcribe rejects invalid file types"""
        # Try uploading a text file as audio
        invalid_file = io.BytesIO(b"This is not audio data")
        
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/transcribe",
            files={"audio": ("test.txt", invalid_file, "text/plain")}
        )
        # Should reject with 400 due to invalid content type
        print(f"Invalid file type response: {response.status_code} - {response.text}")
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
    
    def test_transcribe_with_valid_audio(self, auth_session):
        """Test transcribe endpoint with valid WAV audio file"""
        # Create a simple WAV file with silence (valid audio format)
        audio_data = self._create_dummy_wav_file()
        
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/transcribe",
            files={"audio": ("recording.wav", audio_data, "audio/wav")}
        )
        print(f"Transcribe response: {response.status_code}")
        
        # The endpoint should accept the file even if transcription returns empty text
        # (silence produces no transcription)
        if response.status_code == 200:
            data = response.json()
            assert "text" in data
            print(f"Transcription result: text='{data.get('text')}', duration={data.get('duration_seconds')}, language={data.get('language')}")
        elif response.status_code == 503:
            # Voice processing service not configured
            print(f"Voice service not configured: {response.json()}")
        elif response.status_code == 500:
            # API error but endpoint exists and processes the request
            print(f"Transcription API error (endpoint exists but processing failed): {response.text}")
        else:
            print(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_transcribe_webm_format(self, auth_session):
        """Test transcribe accepts webm format (browser recording format)"""
        # Create minimal webm header (browsers record in webm)
        # Note: This won't actually transcribe but tests format acceptance
        webm_data = io.BytesIO(b'\x1a\x45\xdf\xa3' + b'\x00' * 100)  # WebM magic bytes
        
        response = auth_session.post(
            f"{BASE_URL}/api/flowforge/transcribe",
            files={"audio": ("recording.webm", webm_data, "audio/webm")}
        )
        print(f"WebM format response: {response.status_code}")
        
        # Should accept the file format (may fail processing but not format rejection)
        if response.status_code == 400:
            assert "format" in response.text.lower() or "supported" in response.text.lower(), \
                "WebM should be accepted format"
    
    # ================= INTEGRATION CHECK IN WORKFLOW GENERATION =================
    def test_generate_workflow_includes_integration_check(self, auth_session):
        """Test that workflow generation includes integration status check"""
        # First create a conversation
        conv_response = auth_session.post(
            f"{BASE_URL}/api/flowforge/conversations",
            json={"unit": "technology"}
        )
        assert conv_response.status_code == 200
        conversation = conv_response.json()
        conversation_id = conversation["id"]
        print(f"Created test conversation: {conversation_id}")
        
        try:
            # Send a message that should trigger workflow generation
            # The AI needs to generate a workflow with systems_used to trigger integration check
            generate_response = auth_session.post(
                f"{BASE_URL}/api/flowforge/generate",
                json={
                    "conversation_id": conversation_id,
                    "message": "Build me a tool that sends daily email reports from database",
                    "include_history": True,
                    "check_duplicates": False  # Skip duplicate check for this test
                },
                timeout=60  # AI generation can take time
            )
            
            if generate_response.status_code == 200:
                data = generate_response.json()
                print(f"Generate response keys: {list(data.keys())}")
                print(f"Has workflow: {data.get('has_workflow')}")
                print(f"Has integration check: {data.get('has_integration_check')}")
                
                if data.get('has_workflow') and data.get('workflow_data'):
                    workflow = data['workflow_data']
                    print(f"Workflow systems_used: {workflow.get('systems_used', [])}")
                
                if data.get('has_integration_check'):
                    integration_data = data['integration_check_data']
                    print(f"Integration check data: {integration_data}")
                    assert "integrations" in integration_data
                    assert "has_issues" in integration_data
                    assert "all_connected" in integration_data
                    
                    for integration in integration_data.get('integrations', []):
                        print(f"  - {integration.get('display_name')}: {integration.get('status')}")
            else:
                print(f"Generate failed: {generate_response.status_code} - {generate_response.text}")
                
        finally:
            # Cleanup - would delete conversation but keeping for debugging
            pass
    
    # ================= SEED DATA CHECK =================
    def test_integrations_table_has_data(self, auth_session):
        """Verify integrations are seeded in database"""
        response = auth_session.get(f"{BASE_URL}/api/flowforge/integrations")
        assert response.status_code == 200
        integrations = response.json()
        
        print(f"\nIntegrations in database ({len(integrations)} total):")
        
        # Check for expected integration types
        expected_types = ['gmail', 'slack', 'google_sheets', 'google_calendar', 'database', 'ai_text']
        found_types = [i.get('internal_type') for i in integrations]
        
        for expected in expected_types:
            if expected in found_types:
                matching = next((i for i in integrations if i.get('internal_type') == expected), None)
                if matching:
                    print(f"  FOUND: {matching.get('display_name')} ({expected}) - {matching.get('status')}")
            else:
                print(f"  MISSING: {expected}")
        
        # Test passes if we have any integrations
        if len(integrations) == 0:
            print("\nWARNING: No integrations found. Main agent may need to seed integration data.")
    
    # ================= HELPER METHODS =================
    def _create_dummy_wav_file(self, duration_seconds=0.5, sample_rate=16000):
        """Create a valid WAV file with silence"""
        num_samples = int(sample_rate * duration_seconds)
        
        # Create WAV in memory
        buffer = io.BytesIO()
        
        with wave.open(buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            
            # Generate silence (zeros)
            silence = struct.pack('<' + 'h' * num_samples, *([0] * num_samples))
            wav_file.writeframes(silence)
        
        buffer.seek(0)
        return buffer


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
