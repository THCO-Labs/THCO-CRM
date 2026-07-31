"""
n8n Deployment Service v2
Creates REAL, functional workflows in n8n with proper credentials and nodes.
Also extracts available credentials from existing n8n workflows.
"""

import os
import json
import logging
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

N8N_BASE_URL = os.environ.get('N8N_BASE_URL', '')
N8N_API_KEY = os.environ.get('N8N_API_KEY', '')


def get_n8n_headers() -> Dict[str, str]:
    """Get headers for n8n API requests"""
    return {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": N8N_API_KEY
    }


# ==================== CREDENTIAL DISCOVERY ====================

async def get_available_credentials() -> Dict[str, Dict[str, Any]]:
    """
    Extract all available credentials from existing n8n workflows.
    Since n8n doesn't have a credentials list API, we scan existing workflows.
    
    Returns a dict mapping credential types to their details.
    """
    if not N8N_BASE_URL or not N8N_API_KEY:
        logger.warning("n8n credentials not configured")
        return {}
    
    credentials = {}
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{N8N_BASE_URL}/api/v1/workflows",
                headers=get_n8n_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                for workflow in data.get('data', []):
                    for node in workflow.get('nodes', []):
                        for cred_type, cred_info in node.get('credentials', {}).items():
                            cred_id = cred_info.get('id')
                            if cred_id and cred_type not in credentials:
                                credentials[cred_type] = {
                                    'id': cred_id,
                                    'name': cred_info.get('name'),
                                    'type': cred_type,
                                    'node_type': node.get('type')
                                }
                
                logger.info(f"Discovered {len(credentials)} credential types from n8n")
    
    except Exception as e:
        logger.error(f"Error fetching n8n credentials: {e}")
    
    return credentials


def get_credential_for_integration(integration: str, available_creds: Dict) -> Optional[Dict]:
    """
    Match an integration name to an available n8n credential.
    """
    integration_lower = integration.lower()
    
    # Mapping of integration keywords to credential types
    credential_map = {
        'gmail': 'gmailOAuth2',
        'email': 'gmailOAuth2',
        'google sheets': 'googleSheetsOAuth2Api',
        'spreadsheet': 'googleSheetsOAuth2Api',
        'sheets': 'googleSheetsOAuth2Api',
        'google drive': 'googleDriveOAuth2Api',
        'drive': 'googleDriveOAuth2Api',
        'anthropic': 'anthropicApi',
        'claude': 'anthropicApi',
        'openai': 'openAiApi',
        'gpt': 'openAiApi',
        'serpapi': 'serpApi',
        'serp': 'serpApi',
    }
    
    for keyword, cred_type in credential_map.items():
        if keyword in integration_lower:
            if cred_type in available_creds:
                return available_creds[cred_type]
    
    return None


# ==================== NODE BUILDERS ====================

def build_form_trigger_node(form_fields: List[Dict], workflow_name: str) -> Dict:
    """
    Build a Form Trigger node for n8n.
    This creates a form that users can fill out to trigger the workflow.
    """
    import uuid
    
    # Convert our form fields to n8n form field format
    n8n_fields = []
    for field in form_fields:
        field_type = field.get('type', 'text')
        n8n_field = {
            "fieldLabel": field.get('label', field.get('name', 'Field')),
            "fieldType": _map_field_type(field_type),
            "requiredField": field.get('required', False)
        }
        
        # Add placeholder if provided
        if field.get('placeholder'):
            n8n_field["placeholder"] = field['placeholder']
        
        # Add options for select fields
        if field_type == 'select' and field.get('options'):
            n8n_field["fieldOptions"] = {
                "values": [{"option": opt} for opt in field['options']]
            }
        
        n8n_fields.append(n8n_field)
    
    return {
        "id": str(uuid.uuid4()),
        "name": "Form Input",
        "type": "n8n-nodes-base.formTrigger",
        "typeVersion": 2.2,
        "position": [0, 0],
        "parameters": {
            "formTitle": workflow_name,
            "formDescription": "Fill out this form to run the automation",
            "formFields": {
                "values": n8n_fields
            },
            "options": {
                "respondWithOptions": {
                    "values": {
                        "respondWith": "text",
                        "formSubmittedText": "Your request has been submitted successfully!"
                    }
                }
            }
        }
    }


def _map_field_type(our_type: str) -> str:
    """Map our field types to n8n form field types"""
    type_map = {
        'text': 'text',
        'textarea': 'textarea',
        'email': 'email',
        'number': 'number',
        'select': 'dropdown',
        'date': 'date',
        'file': 'file',
        'checkbox': 'text',  # n8n doesn't have checkbox in forms
    }
    return type_map.get(our_type, 'text')


def build_webhook_trigger_node() -> Dict:
    """Build a webhook trigger node"""
    import uuid
    return {
        "id": str(uuid.uuid4()),
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [0, 0],
        "parameters": {
            "httpMethod": "POST",
            "path": f"flowforge-{uuid.uuid4().hex[:8]}",
            "responseMode": "onReceived",
            "responseData": "allEntries"
        }
    }


def build_schedule_trigger_node(schedule: str = None) -> Dict:
    """Build a schedule trigger node"""
    import uuid
    return {
        "id": str(uuid.uuid4()),
        "name": "Schedule Trigger",
        "type": "n8n-nodes-base.scheduleTrigger",
        "typeVersion": 1.2,
        "position": [0, 0],
        "parameters": {
            "rule": {
                "interval": [{"field": "days", "daysInterval": 1}]
            }
        }
    }


def build_google_sheets_node(
    operation: str,
    credential: Dict,
    sheet_id: str = None,
    position: List[int] = None
) -> Dict:
    """Build a Google Sheets node"""
    import uuid
    params = {
        "operation": operation,  # read, append, update, delete
    }
    
    if operation == "read":
        params["options"] = {}
    
    return {
        "id": str(uuid.uuid4()),
        "name": f"Google Sheets - {operation.title()}",
        "type": "n8n-nodes-base.googleSheets",
        "typeVersion": 4.5,
        "position": position or [250, 0],
        "credentials": {
            "googleSheetsOAuth2Api": {
                "id": credential['id'],
                "name": credential['name']
            }
        },
        "parameters": params
    }


def build_gmail_node(
    operation: str,
    credential: Dict,
    position: List[int] = None
) -> Dict:
    """Build a Gmail node"""
    import uuid
    params = {
        "sendTo": "={{ $json.email }}",
        "subject": "={{ $json.subject }}",
        "message": "={{ $json.message }}",
        "options": {}
    }
    
    return {
        "id": str(uuid.uuid4()),
        "name": f"Gmail - Send Email",
        "type": "n8n-nodes-base.gmail",
        "typeVersion": 2.1,
        "position": position or [500, 0],
        "credentials": {
            "gmailOAuth2": {
                "id": credential['id'],
                "name": credential['name']
            }
        },
        "parameters": params
    }


def build_ai_agent_node(
    credential: Dict,
    prompt: str = None,
    position: List[int] = None
) -> Dict:
    """Build an AI Agent node using Claude"""
    import uuid
    return {
        "id": str(uuid.uuid4()),
        "name": "AI Agent",
        "type": "@n8n/n8n-nodes-langchain.agent",
        "typeVersion": 1.7,
        "position": position or [750, 0],
        "parameters": {
            "text": prompt or "={{ $json.prompt }}",
            "options": {}
        }
    }


def build_code_node(
    code: str,
    name: str = "Process Data",
    position: List[int] = None
) -> Dict:
    """Build a Code node for custom JavaScript"""
    import uuid
    return {
        "id": str(uuid.uuid4()),
        "name": name,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": position or [250, 0],
        "parameters": {
            "jsCode": code
        }
    }


def build_set_node(
    data_to_set: Dict[str, str],
    name: str = "Set Data",
    position: List[int] = None
) -> Dict:
    """Build a Set node to transform data"""
    import uuid
    assignments = [
        {"id": str(uuid.uuid4()), "name": k, "value": v, "type": "string"}
        for k, v in data_to_set.items()
    ]
    
    return {
        "id": str(uuid.uuid4()),
        "name": name,
        "type": "n8n-nodes-base.set",
        "typeVersion": 3.4,
        "position": position or [250, 0],
        "parameters": {
            "mode": "manual",
            "duplicateItem": False,
            "assignments": {"assignments": assignments}
        }
    }


def build_http_request_node(
    url: str,
    method: str = "GET",
    name: str = "HTTP Request",
    position: List[int] = None
) -> Dict:
    """Build an HTTP Request node"""
    import uuid
    return {
        "id": str(uuid.uuid4()),
        "name": name,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": position or [250, 0],
        "parameters": {
            "method": method,
            "url": url,
            "options": {}
        }
    }


# ==================== WORKFLOW BUILDER ====================

async def build_workflow_from_spec(
    tool_name: str,
    description: str,
    trigger_type: str,
    integrations: List[str],
    steps: List[Dict],
    form_fields: List[Dict] = None
) -> Dict:
    """
    Build a complete, functional n8n workflow from a specification.
    
    Args:
        tool_name: Name of the tool
        description: What the tool does
        trigger_type: 'form', 'webhook', 'schedule', or 'manual'
        integrations: List of required integrations ['Gmail', 'Google Sheets', etc.]
        steps: List of workflow steps with actions
        form_fields: Form fields if trigger_type is 'form'
    
    Returns:
        Complete n8n workflow JSON ready for deployment
    """
    
    # Get available credentials
    available_creds = await get_available_credentials()
    
    nodes = []
    connections = {}
    
    # 1. Build trigger node
    if trigger_type == 'form' and form_fields:
        trigger = build_form_trigger_node(form_fields, tool_name)
    elif trigger_type == 'webhook':
        trigger = build_webhook_trigger_node()
    elif trigger_type == 'schedule':
        trigger = build_schedule_trigger_node()
    else:
        trigger = {
            "id": "manual-trigger",
            "name": "Manual Trigger",
            "type": "n8n-nodes-base.manualTrigger",
            "typeVersion": 1,
            "position": [0, 0],
            "parameters": {}
        }
    
    nodes.append(trigger)
    prev_node_name = trigger["name"]
    
    # 2. Build step nodes based on integrations and steps
    x_pos = 250
    
    for i, step in enumerate(steps):
        step_integration = step.get('integration', '').lower()
        step_action = step.get('action', step.get('name', ''))
        
        node = None
        
        # Match step to appropriate node type
        if 'sheet' in step_integration or 'spreadsheet' in step_integration:
            cred = get_credential_for_integration('google sheets', available_creds)
            if cred:
                operation = 'read' if 'read' in step_action.lower() else 'append'
                node = build_google_sheets_node(operation, cred, position=[x_pos, 0])
        
        elif 'gmail' in step_integration or 'email' in step_integration:
            cred = get_credential_for_integration('gmail', available_creds)
            if cred:
                operation = 'send'
                node = build_gmail_node(operation, cred, position=[x_pos, 0])
        
        elif 'ai' in step_integration or 'generate' in step_action.lower():
            cred = get_credential_for_integration('anthropic', available_creds)
            if cred:
                node = build_ai_agent_node(cred, position=[x_pos, 0])
        
        elif 'code' in step_integration or 'process' in step_action.lower():
            code = step.get('code', '// Process data\nreturn items;')
            node = build_code_node(code, step_action, position=[x_pos, 0])
        
        elif 'http' in step_integration or 'api' in step_action.lower():
            url = step.get('url', 'https://api.example.com')
            node = build_http_request_node(url, 'POST', step_action, position=[x_pos, 0])
        
        # Default: Create a Set node with step info
        if not node:
            node = build_set_node(
                {"step": step_action, "description": step.get('description', '')},
                step_action,
                position=[x_pos, 0]
            )
        
        nodes.append(node)
        
        # Connect to previous node
        if prev_node_name not in connections:
            connections[prev_node_name] = {"main": [[]]}
        
        connections[prev_node_name]["main"][0].append({
            "node": node["name"],
            "type": "main",
            "index": 0
        })
        
        prev_node_name = node["name"]
        x_pos += 250
    
    # Build final workflow
    workflow = {
        "name": f"[FlowForge] {tool_name}",
        "nodes": nodes,
        "connections": connections,
        "settings": {
            "executionOrder": "v1"
        }
    }
    
    return workflow


# ==================== DEPLOYMENT ====================

async def create_n8n_workflow(
    tool_name: str,
    description: str,
    workflow_steps: List[Dict[str, Any]],
    trigger_type: str = "manual",
    trigger_description: str = None,
    integrations: List[str] = None,
    form_fields: List[Dict] = None,
    tags: List[str] = None,
    unit: str = None
) -> Dict[str, Any]:
    """
    Create a workflow in n8n via their API.
    
    Returns:
        Dict with workflow_id, workflow_url, form_url, and status
    """
    
    if not N8N_BASE_URL or not N8N_API_KEY:
        logger.warning("n8n credentials not configured")
        return {
            "success": False,
            "error": "n8n credentials not configured",
            "workflow_id": None,
            "workflow_url": None,
            "form_url": None
        }
    
    # Build the workflow
    workflow_json = await build_workflow_from_spec(
        tool_name=tool_name,
        description=description,
        trigger_type=trigger_type,
        integrations=integrations or [],
        steps=workflow_steps,
        form_fields=form_fields
    )
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{N8N_BASE_URL}/api/v1/workflows",
                headers=get_n8n_headers(),
                json=workflow_json
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                workflow_id = result.get('id')
                
                # Get the form URL if it's a form trigger workflow
                form_url = None
                if trigger_type == 'form':
                    # Form URL pattern: {base_url}/form/{workflow_id}
                    form_url = f"{N8N_BASE_URL}/form/{workflow_id}"
                
                logger.info(f"Created n8n workflow: {workflow_id}")
                
                return {
                    "success": True,
                    "workflow_id": workflow_id,
                    "workflow_url": f"{N8N_BASE_URL}/workflow/{workflow_id}",
                    "form_url": form_url,
                    "workflow_name": result.get('name'),
                    "active": result.get('active', False),
                    "nodes_created": len(workflow_json.get('nodes', []))
                }
            else:
                error_msg = response.text
                logger.error(f"Failed to create n8n workflow: {response.status_code} - {error_msg}")
                
                return {
                    "success": False,
                    "error": f"n8n API error: {response.status_code}",
                    "error_detail": error_msg,
                    "workflow_id": None,
                    "workflow_url": None,
                    "form_url": None
                }
    
    except httpx.RequestError as e:
        logger.error(f"n8n connection error: {e}")
        return {
            "success": False,
            "error": f"Connection error: {str(e)}",
            "workflow_id": None,
            "workflow_url": None,
            "form_url": None
        }
    except Exception as e:
        logger.error(f"Unexpected error creating n8n workflow: {e}")
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "workflow_id": None,
            "workflow_url": None,
            "form_url": None
        }


async def activate_n8n_workflow(workflow_id: str, active: bool = True) -> Dict[str, Any]:
    """Activate or deactivate a workflow in n8n"""
    
    if not N8N_BASE_URL or not N8N_API_KEY:
        return {"success": False, "error": "n8n credentials not configured"}
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # n8n uses POST to /activate or /deactivate endpoints
            endpoint = "activate" if active else "deactivate"
            response = await client.post(
                f"{N8N_BASE_URL}/api/v1/workflows/{workflow_id}/{endpoint}",
                headers=get_n8n_headers()
            )
            
            if response.status_code in [200, 201]:
                return {"success": True, "active": active}
            else:
                return {
                    "success": False,
                    "error": f"Failed to {endpoint} workflow: {response.status_code} - {response.text}"
                }
    
    except Exception as e:
        logger.error(f"Error activating workflow: {e}")
        return {"success": False, "error": str(e)}


async def get_n8n_workflow(workflow_id: str) -> Optional[Dict[str, Any]]:
    """Get workflow details from n8n"""
    
    if not N8N_BASE_URL or not N8N_API_KEY:
        return None
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{N8N_BASE_URL}/api/v1/workflows/{workflow_id}",
                headers=get_n8n_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            return None
    
    except Exception as e:
        logger.error(f"Error getting workflow: {e}")
        return None


async def delete_n8n_workflow(workflow_id: str) -> Dict[str, Any]:
    """Delete a workflow from n8n"""
    
    if not N8N_BASE_URL or not N8N_API_KEY:
        return {"success": False, "error": "n8n credentials not configured"}
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.delete(
                f"{N8N_BASE_URL}/api/v1/workflows/{workflow_id}",
                headers=get_n8n_headers()
            )
            
            if response.status_code in [200, 204]:
                return {"success": True}
            else:
                return {
                    "success": False,
                    "error": f"Failed to delete workflow: {response.status_code}"
                }
    
    except Exception as e:
        logger.error(f"Error deleting workflow: {e}")
        return {"success": False, "error": str(e)}


async def execute_n8n_workflow(
    workflow_id: str,
    input_data: Dict[str, Any],
    user_id: str = None,
    user_name: str = None
) -> Dict[str, Any]:
    """
    Execute an n8n workflow by triggering it via webhook or form endpoint.
    
    n8n doesn't have a direct API to trigger workflows programmatically.
    Workflows must have a Webhook or Form Trigger node to be executed externally.
    
    This function:
    1. Gets the workflow details to find webhook/form URLs
    2. Triggers via the appropriate endpoint (webhook, form, or test webhook)
    """
    
    if not N8N_BASE_URL or not N8N_API_KEY:
        return {"success": False, "error": "n8n credentials not configured"}
    
    try:
        # Add metadata to input
        execution_input = {
            **input_data,
            "_flowforge_metadata": {
                "triggered_by": user_name or "Unknown",
                "triggered_by_id": user_id,
                "triggered_at": datetime.now(timezone.utc).isoformat(),
                "source": "thco_portal"
            }
        }
        
        async with httpx.AsyncClient(timeout=60) as client:
            # First, get the workflow to find trigger node info
            workflow = await get_n8n_workflow(workflow_id)
            
            if not workflow:
                return {
                    "success": False,
                    "error": "Workflow not found in n8n"
                }
            
            # Look for trigger nodes that can receive external requests
            for node in workflow.get('nodes', []):
                node_type = node.get('type', '')
                
                # Handle Form Trigger
                if 'formTrigger' in node_type:
                    # Form trigger URL pattern: {base}/form/{workflowId}
                    # For test/production webhook URL: {base}/webhook-test/{path} or {base}/webhook/{path}
                    webhook_id = node.get('webhookId', '')
                    
                    # Try test webhook first (works even if workflow is inactive)
                    form_urls_to_try = [
                        f"{N8N_BASE_URL}/webhook-test/{webhook_id}",  # Test webhook
                        f"{N8N_BASE_URL}/webhook/{webhook_id}",       # Production webhook
                        f"{N8N_BASE_URL}/form/{workflow_id}",         # Form URL
                    ]
                    
                    for url in form_urls_to_try:
                        if not webhook_id and 'webhook' in url:
                            continue  # Skip webhook URLs if no webhookId
                            
                        try:
                            logger.info(f"Trying to trigger workflow via: {url}")
                            response = await client.post(
                                url,
                                json=execution_input,
                                headers={"Content-Type": "application/json"},
                                timeout=30
                            )
                            
                            if response.status_code in [200, 201]:
                                try:
                                    result_data = response.json() if response.text else {}
                                except:
                                    result_data = {"raw_response": response.text}
                                    
                                logger.info(f"Workflow {workflow_id} executed via form trigger")
                                return {
                                    "success": True,
                                    "data": result_data,
                                    "method": "form_trigger",
                                    "message": "Tool executed successfully!"
                                }
                        except httpx.RequestError as e:
                            logger.warning(f"Failed to trigger via {url}: {e}")
                            continue
                
                # Handle Webhook Trigger
                elif 'webhook' in node_type.lower():
                    webhook_id = node.get('webhookId', '')
                    webhook_path = node.get('parameters', {}).get('path', '')
                    
                    webhook_urls_to_try = []
                    if webhook_id:
                        webhook_urls_to_try.append(f"{N8N_BASE_URL}/webhook-test/{webhook_id}")
                        webhook_urls_to_try.append(f"{N8N_BASE_URL}/webhook/{webhook_id}")
                    if webhook_path:
                        webhook_urls_to_try.append(f"{N8N_BASE_URL}/webhook-test/{webhook_path}")
                        webhook_urls_to_try.append(f"{N8N_BASE_URL}/webhook/{webhook_path}")
                    
                    for url in webhook_urls_to_try:
                        try:
                            logger.info(f"Trying to trigger workflow via webhook: {url}")
                            response = await client.post(
                                url,
                                json=execution_input,
                                headers={"Content-Type": "application/json"},
                                timeout=30
                            )
                            
                            if response.status_code in [200, 201]:
                                try:
                                    result_data = response.json() if response.text else {}
                                except:
                                    result_data = {"raw_response": response.text}
                                    
                                logger.info(f"Workflow {workflow_id} executed via webhook")
                                return {
                                    "success": True,
                                    "data": result_data,
                                    "method": "webhook",
                                    "message": "Tool executed successfully!"
                                }
                        except httpx.RequestError as e:
                            logger.warning(f"Failed to trigger via {url}: {e}")
                            continue
            
            # No suitable trigger node found
            logger.error(f"Workflow {workflow_id} has no webhook or form trigger node")
            return {
                "success": False,
                "error": "This workflow cannot be triggered externally. It needs a Webhook or Form Trigger node.",
                "detail": "FlowForge workflows created via the approval process should have form triggers. Please check the workflow in n8n."
            }
    
    except httpx.RequestError as e:
        logger.error(f"n8n connection error during execution: {e}")
        return {"success": False, "error": f"Connection error: {str(e)}"}
    except Exception as e:
        logger.error(f"Error executing workflow: {e}")
        return {"success": False, "error": str(e)}


# ==================== INTEGRATION ANALYSIS ====================

KNOWN_INTEGRATIONS = {
    "google_sheets": {
        "display_name": "Google Sheets",
        "icon": "📊",
        "credential_type": "googleSheetsOAuth2Api",
        "node_type": "n8n-nodes-base.googleSheets",
        "keywords": ["spreadsheet", "sheet", "google sheets", "excel"]
    },
    "gmail": {
        "display_name": "Gmail",
        "icon": "📧",
        "credential_type": "gmailOAuth2",
        "node_type": "n8n-nodes-base.gmail",
        "keywords": ["email", "gmail", "mail", "send email"]
    },
    "google_drive": {
        "display_name": "Google Drive",
        "icon": "📁",
        "credential_type": "googleDriveOAuth2Api",
        "node_type": "n8n-nodes-base.googleDrive",
        "keywords": ["drive", "google drive", "file", "upload", "download"]
    },
    "anthropic": {
        "display_name": "AI (Claude)",
        "icon": "🤖",
        "credential_type": "anthropicApi",
        "node_type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
        "keywords": ["ai", "claude", "anthropic", "generate", "text generation"]
    },
    "openai": {
        "display_name": "AI (OpenAI)",
        "icon": "🤖",
        "credential_type": "openAiApi",
        "node_type": "@n8n/n8n-nodes-langchain.openAi",
        "keywords": ["openai", "gpt", "chatgpt"]
    },
    "slack": {
        "display_name": "Slack",
        "icon": "💬",
        "credential_type": "slackOAuth2Api",
        "node_type": "n8n-nodes-base.slack",
        "keywords": ["slack", "message", "notification", "team"]
    },
    "webhook": {
        "display_name": "Webhook / API",
        "icon": "🔗",
        "credential_type": None,
        "node_type": "n8n-nodes-base.webhook",
        "keywords": ["webhook", "api", "http", "external"]
    }
}


async def analyze_required_integrations(brief_text: str) -> Dict[str, Any]:
    """
    Analyze a problem brief and determine what integrations are needed.
    Also checks which integrations are available in n8n.
    """
    available_creds = await get_available_credentials()
    
    required = []
    missing = []
    
    brief_lower = brief_text.lower()
    
    for integration_id, info in KNOWN_INTEGRATIONS.items():
        # Check if any keyword matches
        if any(kw in brief_lower for kw in info['keywords']):
            cred_type = info['credential_type']
            
            integration_info = {
                "id": integration_id,
                "name": info['display_name'],
                "icon": info['icon'],
                "available": cred_type in available_creds if cred_type else True
            }
            
            if integration_info['available']:
                required.append(integration_info)
            else:
                missing.append(integration_info)
    
    return {
        "required": required,
        "missing": missing,
        "all_available": len(missing) == 0
    }
