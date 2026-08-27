"""
Test suite for Proposal Management System
Tests: Clients CRUD, Proposals CRUD, Share Links, Public Access
"""
import pytest
import requests
import os
# Credentials come from the environment. This file used to carry the
# super admin's real password as a literal, in a tracked file, which
# meant anybody with repository access had it.
TEST_ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', '')
TEST_ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', '')

import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProposalManagement:
    """Proposal Management System Tests"""
    
    @pytest.fixture(scope="class")
    def session_token(self):
        """Login and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        return data["session_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, session_token):
        """Get auth headers with session token"""
        return {
            "Content-Type": "application/json",
            "Cookie": f"session_token={session_token}"
        }
    
    @pytest.fixture(scope="class")
    def auth_session(self, session_token):
        """Get requests session with auth cookie"""
        session = requests.Session()
        session.cookies.set("session_token", session_token)
        return session
    
    # ==================== CLIENT TESTS ====================
    
    def test_get_clients_list(self, auth_session):
        """Test GET /api/clients - List all clients"""
        response = auth_session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200, f"Failed to get clients: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/clients - Found {len(data)} clients")
    
    def test_create_client(self, auth_session):
        """Test POST /api/clients - Create new client folder"""
        payload = {
            "name": "TEST_Client_Pytest",
            "description": "Test client created by pytest"
        }
        response = auth_session.post(
            f"{BASE_URL}/api/clients",
            json=payload
        )
        assert response.status_code == 200, f"Failed to create client: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "client_id" in data
        assert data["name"] == payload["name"]
        assert data["description"] == payload["description"]
        assert data["proposal_count"] == 0
        
        print(f"✓ POST /api/clients - Created client: {data['client_id']}")
        return data["client_id"]
    
    def test_create_duplicate_client_fails(self, auth_session):
        """Test that creating duplicate client name fails"""
        # First create a client
        payload = {"name": "TEST_Duplicate_Client", "description": ""}
        response1 = auth_session.post(f"{BASE_URL}/api/clients", json=payload)
        
        if response1.status_code == 200:
            # Try to create same client again
            response2 = auth_session.post(f"{BASE_URL}/api/clients", json=payload)
            assert response2.status_code == 400, "Should fail for duplicate client name"
            print("✓ Duplicate client creation correctly rejected")
            
            # Cleanup
            client_id = response1.json()["client_id"]
            auth_session.delete(f"{BASE_URL}/api/clients/{client_id}")
    
    def test_get_client_proposals_empty(self, auth_session):
        """Test GET /api/clients/{id}/proposals - Get proposals for client"""
        # Create a test client first
        create_resp = auth_session.post(
            f"{BASE_URL}/api/clients",
            json={"name": "TEST_Empty_Proposals_Client", "description": ""}
        )
        assert create_resp.status_code == 200
        client_id = create_resp.json()["client_id"]
        
        # Get proposals (should be empty)
        response = auth_session.get(f"{BASE_URL}/api/clients/{client_id}/proposals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
        
        print(f"✓ GET /api/clients/{client_id}/proposals - Empty list returned")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/clients/{client_id}")
    
    def test_delete_client(self, auth_session):
        """Test DELETE /api/clients/{id} - Delete client folder"""
        # Create a client to delete
        create_resp = auth_session.post(
            f"{BASE_URL}/api/clients",
            json={"name": "TEST_Delete_Client", "description": "To be deleted"}
        )
        assert create_resp.status_code == 200
        client_id = create_resp.json()["client_id"]
        
        # Delete the client
        response = auth_session.delete(f"{BASE_URL}/api/clients/{client_id}")
        assert response.status_code == 200
        
        # Verify deletion - should return 404
        verify_resp = auth_session.get(f"{BASE_URL}/api/clients/{client_id}/proposals")
        assert verify_resp.status_code == 404
        
        print(f"✓ DELETE /api/clients/{client_id} - Client deleted successfully")
    
    # ==================== PROPOSAL TESTS ====================
    
    def test_upload_proposal(self, auth_session):
        """Test POST /api/clients/{id}/proposals - Upload proposal file"""
        # Create a test client
        create_resp = auth_session.post(
            f"{BASE_URL}/api/clients",
            json={"name": "TEST_Upload_Client", "description": "For upload test"}
        )
        assert create_resp.status_code == 200
        client_id = create_resp.json()["client_id"]
        
        # Create a test PDF file (minimal valid PDF)
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
        
        files = {
            'file': ('test_proposal.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        
        # Remove content-type header for multipart upload
        response = auth_session.post(
            f"{BASE_URL}/api/clients/{client_id}/proposals",
            files=files
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        # Validate response
        assert "proposal_id" in data
        assert "share_token" in data
        assert "share_url" in data
        assert data["file_type"] == "PDF"
        assert data["client_id"] == client_id
        
        print(f"✓ POST /api/clients/{client_id}/proposals - Uploaded proposal: {data['proposal_id']}")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/proposals/{data['proposal_id']}")
        auth_session.delete(f"{BASE_URL}/api/clients/{client_id}")
        
        return data
    
    def test_upload_invalid_file_type(self, auth_session):
        """Test that uploading invalid file type fails"""
        # Create a test client
        create_resp = auth_session.post(
            f"{BASE_URL}/api/clients",
            json={"name": "TEST_Invalid_Upload_Client", "description": ""}
        )
        assert create_resp.status_code == 200
        client_id = create_resp.json()["client_id"]
        
        # Try to upload an invalid file type
        files = {
            'file': ('test.exe', io.BytesIO(b"fake exe content"), 'application/octet-stream')
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/clients/{client_id}/proposals",
            files=files
        )
        assert response.status_code == 400, "Should reject invalid file type"
        
        print("✓ Invalid file type correctly rejected")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/clients/{client_id}")
    
    def test_get_all_proposals(self, auth_session):
        """Test GET /api/proposals - Get all proposals"""
        response = auth_session.get(f"{BASE_URL}/api/proposals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ GET /api/proposals - Found {len(data)} proposals")
    
    def test_delete_proposal(self, auth_session):
        """Test DELETE /api/proposals/{id} - Delete proposal"""
        # Create client and upload proposal
        create_resp = auth_session.post(
            f"{BASE_URL}/api/clients",
            json={"name": "TEST_Delete_Proposal_Client", "description": ""}
        )
        assert create_resp.status_code == 200
        client_id = create_resp.json()["client_id"]
        
        # Upload a proposal
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
        files = {'file': ('delete_test.pdf', io.BytesIO(pdf_content), 'application/pdf')}
        
        upload_resp = auth_session.post(
            f"{BASE_URL}/api/clients/{client_id}/proposals",
            files=files
        )
        assert upload_resp.status_code == 200
        proposal_id = upload_resp.json()["proposal_id"]
        
        # Delete the proposal
        delete_resp = auth_session.delete(f"{BASE_URL}/api/proposals/{proposal_id}")
        assert delete_resp.status_code == 200
        
        print(f"✓ DELETE /api/proposals/{proposal_id} - Proposal deleted")
        
        # Cleanup client
        auth_session.delete(f"{BASE_URL}/api/clients/{client_id}")
    
    def test_regenerate_share_link(self, auth_session):
        """Test POST /api/proposals/{id}/regenerate-link - Regenerate share link"""
        # Create client and upload proposal
        create_resp = auth_session.post(
            f"{BASE_URL}/api/clients",
            json={"name": "TEST_Regenerate_Link_Client", "description": ""}
        )
        assert create_resp.status_code == 200
        client_id = create_resp.json()["client_id"]
        
        # Upload a proposal
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
        files = {'file': ('regen_test.pdf', io.BytesIO(pdf_content), 'application/pdf')}
        
        upload_resp = auth_session.post(
            f"{BASE_URL}/api/clients/{client_id}/proposals",
            files=files
        )
        assert upload_resp.status_code == 200
        proposal_data = upload_resp.json()
        proposal_id = proposal_data["proposal_id"]
        old_token = proposal_data["share_token"]
        
        # Regenerate link
        regen_resp = auth_session.post(f"{BASE_URL}/api/proposals/{proposal_id}/regenerate-link")
        assert regen_resp.status_code == 200
        new_data = regen_resp.json()
        
        assert "share_token" in new_data
        assert "share_url" in new_data
        assert new_data["share_token"] != old_token, "New token should be different"
        
        print(f"✓ POST /api/proposals/{proposal_id}/regenerate-link - New token generated")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/proposals/{proposal_id}")
        auth_session.delete(f"{BASE_URL}/api/clients/{client_id}")
    
    # ==================== PUBLIC ACCESS TESTS ====================
    
    def test_public_share_link_access(self):
        """Test GET /api/proposals/shared/{token} - Public access (no auth)"""
        # Use the existing test share token
        share_token = "wQZ6CxrQ9LW3Ii56GX57NcAhPkVZQKuT4wR2LUo_SzA"
        
        # No auth required for this endpoint
        response = requests.get(f"{BASE_URL}/api/proposals/shared/{share_token}")
        assert response.status_code == 200, f"Public share access failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "proposal_id" in data
        assert "client_name" in data
        assert "filename" in data
        assert "file_type" in data
        assert "file_size" in data
        
        print(f"✓ GET /api/proposals/shared/{share_token} - Public access works")
        print(f"  Client: {data['client_name']}, File: {data['filename']}")
    
    def test_public_download_link(self):
        """Test GET /api/proposals/shared/{token}/download - Public download"""
        share_token = "wQZ6CxrQ9LW3Ii56GX57NcAhPkVZQKuT4wR2LUo_SzA"
        
        # No auth required
        response = requests.get(
            f"{BASE_URL}/api/proposals/shared/{share_token}/download",
            allow_redirects=False
        )
        # Should return file or redirect
        assert response.status_code in [200, 302, 307], f"Download failed: {response.status_code}"
        
        print(f"✓ GET /api/proposals/shared/{share_token}/download - Download endpoint works")
    
    def test_invalid_share_token(self):
        """Test that invalid share token returns 404"""
        response = requests.get(f"{BASE_URL}/api/proposals/shared/invalid_token_12345")
        assert response.status_code == 404
        
        print("✓ Invalid share token correctly returns 404")
    
    # ==================== CLEANUP ====================
    
    def test_cleanup_test_clients(self, auth_session):
        """Cleanup any remaining test clients"""
        response = auth_session.get(f"{BASE_URL}/api/clients")
        if response.status_code == 200:
            clients = response.json()
            for client in clients:
                if client["name"].startswith("TEST_"):
                    auth_session.delete(f"{BASE_URL}/api/clients/{client['client_id']}")
                    print(f"  Cleaned up test client: {client['name']}")
        
        print("✓ Test cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
