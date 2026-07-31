"""
FlowForge - AI-Powered Workflow Automation Builder
Handles conversations, workflow generation, and approvals via Supabase (PostgreSQL)
"""

from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import os
import uuid
import logging
import httpx
import tempfile
import asyncio
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize Supabase client
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or create_client is None:
    if create_client is None:
        logger.warning("Supabase library not installed; FlowForge Supabase features disabled")
    else:
        logger.error("Supabase credentials not found in environment variables")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    logger.info("Supabase client initialized successfully")

# n8n configuration
N8N_BASE_URL = os.environ.get('N8N_BASE_URL', '')
N8N_API_KEY = os.environ.get('N8N_API_KEY', '')

# Create router with prefix
router = APIRouter(prefix="/flowforge", tags=["FlowForge"])

# ==================== PYDANTIC MODELS ====================

class ConversationCreate(BaseModel):
    unit: str
    tool_name: Optional[str] = None

class ConversationUpdate(BaseModel):
    tool_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None

class ConversationResponse(BaseModel):
    id: str
    tool_name: Optional[str]
    description: Optional[str]
    unit: str
    tags: List[str]
    status: str
    created_by: str
    created_by_name: str
    created_by_email: Optional[str]
    engine_workflow_id: Optional[str]
    workflow_version: int
    trigger_type: Optional[str]
    trigger_description: Optional[str]
    systems_used: List[str]
    execution_count: int
    success_count: int
    error_count: int
    last_execution_at: Optional[str]
    created_at: str
    updated_at: str

class MessageCreate(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    has_voice: bool = False
    voice_url: Optional[str] = None
    voice_duration_seconds: Optional[int] = None
    voice_transcription: Optional[str] = None
    has_workflow_preview: bool = False
    workflow_preview_json: Optional[Dict[str, Any]] = None
    workflow_version: Optional[int] = None
    has_action_buttons: bool = False
    action_buttons: Optional[List[Dict[str, Any]]] = None
    has_duplicate_alert: bool = False
    duplicate_data: Optional[Dict[str, Any]] = None
    has_integration_check: bool = False
    integration_check_data: Optional[Dict[str, Any]] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    has_voice: bool
    voice_url: Optional[str]
    voice_duration_seconds: Optional[int]
    voice_transcription: Optional[str]
    has_workflow_preview: bool
    workflow_preview_json: Optional[Dict[str, Any]]
    workflow_version: Optional[int]
    has_action_buttons: bool
    action_buttons: Optional[List[Dict[str, Any]]]
    has_duplicate_alert: bool
    duplicate_data: Optional[Dict[str, Any]]
    has_integration_check: bool
    integration_check_data: Optional[Dict[str, Any]]
    message_index: int
    created_at: str

class ApprovalCreate(BaseModel):
    conversation_id: str
    request_type: str = Field(..., pattern="^(new_tool|update|activate|delete|move)$")
    tool_name: str
    request_summary: str
    request_details: Dict[str, Any]
    proposed_workflow_json: Optional[Dict[str, Any]] = None
    current_workflow_json: Optional[Dict[str, Any]] = None
    current_state: Optional[Dict[str, Any]] = None
    proposed_changes: Optional[Dict[str, Any]] = None
    impact_assessment: Optional[Dict[str, Any]] = None
    similar_tools_found: Optional[List[Dict[str, Any]]] = None

class ApprovalResponse(BaseModel):
    id: str
    conversation_id: str
    request_type: str
    requested_by: str
    requested_by_name: str
    unit: str
    tool_name: str
    request_summary: str
    request_details: Dict[str, Any]
    status: str
    decided_by: Optional[str]
    decided_by_name: Optional[str]
    decision_note: Optional[str]
    decided_at: Optional[str]
    created_at: str

class ApprovalAction(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|request_changes)$")
    note: Optional[str] = None

class AdminCreate(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    admin_type: str = Field(..., pattern="^(unit_admin|company_admin)$")
    unit: Optional[str] = None

class AdminResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    admin_type: str
    unit: Optional[str]
    assigned_by: str
    is_active: bool
    created_at: str

class IntegrationResponse(BaseModel):
    id: str
    display_name: str
    internal_type: str
    credential_name: Optional[str]
    status: str
    icon: Optional[str]
    last_verified_at: Optional[str]

class WorkflowInventoryResponse(BaseModel):
    id: str
    engine_workflow_id: str
    name: str
    description: Optional[str]
    nodes_summary: Optional[str]
    trigger_type: Optional[str]
    is_active: bool
    tags: List[str]
    unit: Optional[str]
    conversation_id: Optional[str]
    is_flowforge_created: bool
    last_synced_at: str

# ==================== HELPER FUNCTIONS ====================

def ensure_supabase():
    """Ensure Supabase client is initialized"""
    if not supabase:
        raise HTTPException(
            status_code=503, 
            detail="Database service unavailable. Please check configuration."
        )
    return supabase

async def get_current_user_from_request(request: Request) -> dict:
    """Import and use the existing auth function from server.py"""
    # Import here to avoid circular imports
    import sys
    sys.path.insert(0, '/app/backend')
    from server import get_current_user
    return await get_current_user(request)

def get_next_message_index(conversation_id: str) -> int:
    """Get the next message index for a conversation"""
    sb = ensure_supabase()
    result = sb.table('flowforge_messages').select('message_index').eq('conversation_id', conversation_id).order('message_index', desc=True).limit(1).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]['message_index'] + 1
    return 0

# ==================== CONVERSATION ROUTES ====================

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    request: Request,
    unit: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """List all conversations with optional filters"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    query = sb.table('flowforge_conversations').select('*')
    
    # Filter by unit if specified
    if unit:
        query = query.eq('unit', unit)
    
    # Filter by status if specified
    if status:
        query = query.eq('status', status)
    
    # For non-admins, only show their own conversations
    if user.get('role') not in ['super_admin', 'company_admin']:
        query = query.eq('created_by', user['user_id'])
    
    result = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
    
    return result.data or []

@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(data: ConversationCreate, request: Request):
    """Create a new FlowForge conversation"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    conversation_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    conversation_doc = {
        'id': conversation_id,
        'tool_name': data.tool_name,
        'description': None,
        'unit': data.unit,
        'tags': [],
        'icon': 'default',
        'created_by': user['user_id'],
        'created_by_name': user['name'],
        'created_by_email': user.get('email'),
        'engine_workflow_id': None,
        'engine_workflow_url': None,
        'current_workflow_json': None,
        'workflow_version': 0,
        'status': 'building',
        'trigger_type': None,
        'trigger_description': None,
        'systems_used': [],
        'execution_count': 0,
        'success_count': 0,
        'error_count': 0,
        'last_execution_at': None,
        'last_error_message': None,
        'alert_on_failure': True,
        'alert_channels': ['slack'],
        'access_level': 'unit',
        'created_at': now,
        'updated_at': now,
        'deployed_at': None,
        'last_opened_at': now
    }
    
    result = sb.table('flowforge_conversations').insert(conversation_doc).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create conversation")
    
    # Add the welcome message with the structured template
    try:
        from services.guided_input import get_welcome_template, get_unit_display_name
        
        unit_display_name = get_unit_display_name(data.unit)
        welcome_content = get_welcome_template(data.unit, unit_display_name)
        
        welcome_message = {
            'id': str(uuid.uuid4()),
            'conversation_id': conversation_id,
            'role': 'assistant',
            'content': welcome_content,
            'message_index': 0,
            'created_at': now,
            'has_workflow_preview': False,
            'has_action_buttons': False
        }
        
        sb.table('flowforge_messages').insert(welcome_message).execute()
        logger.info(f"Created welcome message for conversation {conversation_id}")
    except Exception as e:
        logger.warning(f"Failed to create welcome message: {e}")
    
    return result.data[0]

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str, request: Request):
    """Get a specific conversation by ID"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    result = sb.table('flowforge_conversations').select('*').eq('id', conversation_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = result.data[0]
    
    # Check access
    if user.get('role') not in ['super_admin', 'company_admin']:
        if conversation['created_by'] != user['user_id']:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Update last_opened_at
    sb.table('flowforge_conversations').update({
        'last_opened_at': datetime.now(timezone.utc).isoformat()
    }).eq('id', conversation_id).execute()
    
    return conversation

@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(conversation_id: str, data: ConversationUpdate, request: Request):
    """Update a conversation's metadata"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Check conversation exists
    existing = sb.table('flowforge_conversations').select('*').eq('id', conversation_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = existing.data[0]
    
    # Check access
    if user.get('role') not in ['super_admin', 'company_admin']:
        if conversation['created_by'] != user['user_id']:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Build update dict
    update_dict = {'updated_at': datetime.now(timezone.utc).isoformat()}
    if data.tool_name is not None:
        update_dict['tool_name'] = data.tool_name
    if data.description is not None:
        update_dict['description'] = data.description
    if data.status is not None:
        update_dict['status'] = data.status
    if data.tags is not None:
        update_dict['tags'] = data.tags
    
    result = sb.table('flowforge_conversations').update(update_dict).eq('id', conversation_id).execute()
    
    return result.data[0]

# ==================== MESSAGE ROUTES ====================

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(conversation_id: str, request: Request):
    """Get all messages for a conversation"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Check conversation exists and user has access
    conv_result = sb.table('flowforge_conversations').select('created_by').eq('id', conversation_id).execute()
    if not conv_result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = conv_result.data[0]
    if user.get('role') not in ['super_admin', 'company_admin']:
        if conversation['created_by'] != user['user_id']:
            raise HTTPException(status_code=403, detail="Access denied")
    
    result = sb.table('flowforge_messages').select('*').eq('conversation_id', conversation_id).order('message_index').execute()
    
    return result.data or []

@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def add_message(conversation_id: str, data: MessageCreate, request: Request):
    """Add a message to a conversation"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Check conversation exists and user has access
    conv_result = sb.table('flowforge_conversations').select('created_by').eq('id', conversation_id).execute()
    if not conv_result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = conv_result.data[0]
    if user.get('role') not in ['super_admin', 'company_admin']:
        if conversation['created_by'] != user['user_id']:
            raise HTTPException(status_code=403, detail="Access denied")
    
    message_id = str(uuid.uuid4())
    message_index = get_next_message_index(conversation_id)
    now = datetime.now(timezone.utc).isoformat()
    
    message_doc = {
        'id': message_id,
        'conversation_id': conversation_id,
        'role': data.role,
        'content': data.content,
        'has_voice': data.has_voice,
        'voice_url': data.voice_url,
        'voice_duration_seconds': data.voice_duration_seconds,
        'voice_transcription': data.voice_transcription,
        'has_workflow_preview': data.has_workflow_preview,
        'workflow_preview_json': data.workflow_preview_json,
        'workflow_version': data.workflow_version,
        'has_action_buttons': data.has_action_buttons,
        'action_buttons': data.action_buttons,
        'has_duplicate_alert': data.has_duplicate_alert,
        'duplicate_data': data.duplicate_data,
        'has_integration_check': data.has_integration_check,
        'integration_check_data': data.integration_check_data,
        'has_execution_result': False,
        'execution_result': None,
        'message_index': message_index,
        'created_at': now
    }
    
    result = sb.table('flowforge_messages').insert(message_doc).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create message")
    
    # Update conversation's updated_at
    sb.table('flowforge_conversations').update({
        'updated_at': now
    }).eq('id', conversation_id).execute()
    
    return result.data[0]

# ==================== APPROVAL ROUTES ====================

@router.get("/approvals", response_model=List[ApprovalResponse])
async def list_approvals(
    request: Request,
    status: Optional[str] = None,
    unit: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """List approval requests (filtered by admin permissions)"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    query = sb.table('flowforge_approvals').select('*')
    
    # Filter by status if specified
    if status:
        query = query.eq('status', status)
    
    # Filter by unit if specified
    if unit:
        query = query.eq('unit', unit)
    
    # For unit admins, only show their unit's requests
    if user.get('role') not in ['super_admin', 'company_admin']:
        # Check if user is a unit admin
        admin_result = sb.table('flowforge_admins').select('*').eq('user_id', user['user_id']).eq('is_active', True).execute()
        if admin_result.data:
            admin = admin_result.data[0]
            if admin['admin_type'] == 'unit_admin':
                query = query.eq('unit', admin['unit'])
            # company_admin can see all
        else:
            # Not an admin, only show their own requests
            query = query.eq('requested_by', user['user_id'])
    
    result = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
    
    return result.data or []

@router.post("/approvals", response_model=ApprovalResponse)
async def create_approval(data: ApprovalCreate, request: Request):
    """Create a new approval request"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Get conversation to get unit
    conv_result = sb.table('flowforge_conversations').select('unit').eq('id', data.conversation_id).execute()
    if not conv_result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    unit = conv_result.data[0]['unit']
    approval_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    approval_doc = {
        'id': approval_id,
        'conversation_id': data.conversation_id,
        'request_type': data.request_type,
        'requested_by': user['user_id'],
        'requested_by_name': user['name'],
        'unit': unit,
        'tool_name': data.tool_name,
        'request_summary': data.request_summary,
        'request_details': data.request_details,
        'current_state': data.current_state,
        'proposed_changes': data.proposed_changes,
        'impact_assessment': data.impact_assessment,
        'similar_tools_found': data.similar_tools_found,
        'proposed_workflow_json': data.proposed_workflow_json,
        'current_workflow_json': data.current_workflow_json,
        'status': 'pending',
        'decided_by': None,
        'decided_by_name': None,
        'decision_note': None,
        'decided_at': None,
        'admin_notified': False,
        'reminder_sent': False,
        'reminder_sent_at': None,
        'created_at': now,
        'updated_at': now
    }
    
    result = sb.table('flowforge_approvals').insert(approval_doc).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create approval request")
    
    # Update conversation status
    sb.table('flowforge_conversations').update({
        'status': 'pending_approval',
        'updated_at': now
    }).eq('id', data.conversation_id).execute()
    
    return result.data[0]

@router.get("/approvals/stats")
async def get_approval_stats(request: Request):
    """Get approval queue statistics"""
    await get_current_user_from_request(request)  # Ensure authenticated
    if not supabase:
        # FlowForge store not configured (e.g. local dev) — report an empty queue
        return {"pending": 0, "approved": 0, "rejected": 0, "changes_requested": 0, "total": 0}
    sb = ensure_supabase()

    # Count by status
    pending = sb.table('flowforge_approvals').select('id', count='exact').eq('status', 'pending').execute()
    approved = sb.table('flowforge_approvals').select('id', count='exact').eq('status', 'approved').execute()
    rejected = sb.table('flowforge_approvals').select('id', count='exact').eq('status', 'rejected').execute()
    changes_requested = sb.table('flowforge_approvals').select('id', count='exact').eq('status', 'changes_requested').execute()
    
    return {
        "pending": pending.count or 0,
        "approved": approved.count or 0,
        "rejected": rejected.count or 0,
        "changes_requested": changes_requested.count or 0,
        "total": (pending.count or 0) + (approved.count or 0) + (rejected.count or 0) + (changes_requested.count or 0)
    }

@router.get("/approvals/{approval_id}", response_model=ApprovalResponse)
async def get_approval(approval_id: str, request: Request):
    """Get a specific approval request"""
    await get_current_user_from_request(request)  # Ensure authenticated
    sb = ensure_supabase()
    
    result = sb.table('flowforge_approvals').select('*').eq('id', approval_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Approval request not found")
    
    return result.data[0]

@router.post("/approvals/{approval_id}/action")
async def process_approval_action(approval_id: str, data: ApprovalAction, request: Request):
    """Process an approval action (approve/reject/request_changes)"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Check admin permissions
    is_admin = user.get('role') in ['super_admin', 'company_admin']
    if not is_admin:
        admin_result = sb.table('flowforge_admins').select('*').eq('user_id', user['user_id']).eq('is_active', True).execute()
        if not admin_result.data:
            raise HTTPException(status_code=403, detail="Only admins can process approvals")
    
    # Get approval with all details
    approval_result = sb.table('flowforge_approvals').select('*').eq('id', approval_id).execute()
    if not approval_result.data:
        raise HTTPException(status_code=404, detail="Approval request not found")
    
    approval = approval_result.data[0]
    
    if approval['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Approval has already been processed")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Map action to status
    status_map = {
        'approve': 'approved',
        'reject': 'rejected',
        'request_changes': 'changes_requested'
    }
    
    # Initialize deployment result
    deployment_result = None
    n8n_workflow_id = None
    n8n_workflow_url = None
    
    # If approving, deploy to n8n
    if data.action == 'approve':
        try:
            from services.n8n_deployment import create_n8n_workflow
            
            # Get the workflow data from the approval
            workflow_json = approval.get('proposed_workflow_json') or {}
            request_details = approval.get('request_details') or {}
            
            # Get conversation for more details
            conv_result = sb.table('flowforge_conversations').select('*').eq('id', approval['conversation_id']).execute()
            conversation = conv_result.data[0] if conv_result.data else {}
            
            # Build workflow steps from request_details or workflow_json
            workflow_steps = request_details.get('steps') or []
            if not workflow_steps and workflow_json:
                workflow_steps = workflow_json.get('steps') or []
            
            # If still no steps, create a basic placeholder step
            if not workflow_steps:
                workflow_steps = [
                    {
                        "step_number": 1,
                        "name": "Process Request",
                        "description": approval.get('request_summary', 'Process the automation request'),
                        "type": "action"
                    }
                ]
            
            # Get trigger info with safe defaults
            # If tool needs user input, default to 'form' trigger
            trigger_type = request_details.get('trigger_type') or workflow_json.get('trigger_type') or 'form'
            trigger_description = request_details.get('trigger_description') or workflow_json.get('trigger_description')
            
            # Get integrations/systems used
            integrations = request_details.get('systems_used') or workflow_json.get('systems_used') or []
            if not integrations:
                integrations = conversation.get('systems_used', [])
            
            # Build form fields based on the steps/requirements
            form_fields = request_details.get('form_fields') or workflow_json.get('form_fields') or []
            if not form_fields and trigger_type == 'form':
                # Auto-generate basic form fields from the tool description
                form_fields = [
                    {"name": "input_data", "label": "Input Data", "type": "textarea", "required": True, "placeholder": "Paste your data here..."},
                ]
            
            # Create the workflow in n8n
            deployment_result = await create_n8n_workflow(
                tool_name=approval['tool_name'],
                description=approval.get('request_summary', ''),
                workflow_steps=workflow_steps,
                trigger_type=trigger_type,
                trigger_description=trigger_description,
                integrations=integrations,
                form_fields=form_fields,
                tags=[approval['unit'], 'flowforge'],
                unit=approval['unit']
            )
            
            n8n_form_url = None
            if deployment_result.get('success'):
                n8n_workflow_id = deployment_result.get('workflow_id')
                n8n_workflow_url = deployment_result.get('workflow_url')
                n8n_form_url = deployment_result.get('form_url')
                logger.info(f"Successfully deployed workflow to n8n: {n8n_workflow_id}")
            else:
                logger.warning(f"Failed to deploy to n8n: {deployment_result.get('error')}")
                
        except Exception as e:
            logger.error(f"Error deploying to n8n: {e}")
            deployment_result = {"success": False, "error": str(e)}
    
    # Update approval
    update_doc = {
        'status': status_map[data.action],
        'decided_by': user['user_id'],
        'decided_by_name': user['name'],
        'decision_note': data.note,
        'decided_at': now,
        'updated_at': now
    }
    
    sb.table('flowforge_approvals').update(update_doc).eq('id', approval_id).execute()
    
    # Update conversation status based on action
    conv_status_map = {
        'approve': 'deployed',
        'reject': 'building',
        'request_changes': 'changes_requested'
    }
    
    conv_update = {
        'status': conv_status_map[data.action],
        'updated_at': now
    }
    
    if data.action == 'approve':
        conv_update['deployed_at'] = now
        conv_update['tool_name'] = approval['tool_name']  # Update tool name from approval
        if n8n_workflow_id:
            conv_update['engine_workflow_id'] = n8n_workflow_id
            conv_update['engine_workflow_url'] = n8n_workflow_url
        # Note: form_url is stored in the approval message, not in a dedicated column
    
    sb.table('flowforge_conversations').update(conv_update).eq('id', approval['conversation_id']).execute()
    
    # Post approval status message to conversation
    try:
        message_content = _build_approval_status_message(
            action=data.action,
            admin_name=user['name'],
            tool_name=approval['tool_name'],
            note=data.note,
            deployment_result=deployment_result,
            n8n_workflow_url=n8n_workflow_url,
            n8n_form_url=n8n_form_url
        )
        
        # Get next message index
        msg_index = get_next_message_index(approval['conversation_id'])
        
        # Build action buttons
        action_buttons = []
        if data.action == 'approve':
            if n8n_form_url:
                action_buttons.append({"label": "Use Tool (Open Form)", "action": "open_form", "url": n8n_form_url, "primary": True})
            if n8n_workflow_url:
                action_buttons.append({"label": "Edit in Automation Engine", "action": "open_n8n", "url": n8n_workflow_url, "primary": False})
        
        status_message = {
            'id': str(uuid.uuid4()),
            'conversation_id': approval['conversation_id'],
            'role': 'system',
            'content': message_content,
            'message_index': msg_index,
            'created_at': now,
            'has_workflow_preview': False,
            'has_action_buttons': len(action_buttons) > 0,
            'action_buttons': action_buttons if action_buttons else None
        }
        
        sb.table('flowforge_messages').insert(status_message).execute()
        logger.info(f"Posted approval status message to conversation {approval['conversation_id']}")
        
    except Exception as e:
        logger.warning(f"Failed to post approval status message: {e}")
    
    # If approved and deployed, add to workflow inventory
    if data.action == 'approve' and n8n_workflow_id:
        try:
            inventory_doc = {
                'id': str(uuid.uuid4()),
                'engine_workflow_id': n8n_workflow_id,
                'name': approval['tool_name'],
                'description': approval.get('request_summary'),
                'unit': approval['unit'],
                'conversation_id': approval['conversation_id'],
                'is_flowforge_created': True,
                'is_active': False,  # Starts inactive
                'tags': ['flowforge', approval['unit']],
                'last_synced_at': now
            }
            sb.table('flowforge_workflow_inventory').upsert(inventory_doc, on_conflict='engine_workflow_id').execute()
        except Exception as e:
            logger.warning(f"Failed to add to inventory: {e}")
    
    return {
        "message": f"Approval {data.action}d successfully",
        "approval_id": approval_id,
        "status": status_map[data.action],
        "deployment": deployment_result
    }


def _build_approval_status_message(
    action: str,
    admin_name: str,
    tool_name: str,
    note: str = None,
    deployment_result: Dict = None,
    n8n_workflow_url: str = None,
    n8n_form_url: str = None
) -> str:
    """Build the approval status message for the conversation"""
    
    if action == 'approve':
        parts = [
            f"**✅ APPROVED by {admin_name}**",
            "",
            f"Your tool **\"{tool_name}\"** has been approved!"
        ]
        
        if deployment_result and deployment_result.get('success'):
            parts.extend([
                "",
                "**🚀 Deployment Status:**",
                "• Created in THCO Automation Engine",
                "• Status: **Ready** (activate to go live)",
                f"• Workflow ID: `{deployment_result.get('workflow_id')}`"
            ])
            
            # Show form URL prominently if available
            if n8n_form_url:
                parts.extend([
                    "",
                    "**📝 Use Your Tool:**",
                    f"• [Open Form to Use Tool]({n8n_form_url})"
                ])
            
            if n8n_workflow_url:
                parts.append(f"• [Edit in Automation Engine]({n8n_workflow_url})")
        elif deployment_result:
            parts.extend([
                "",
                "**Deployment Status:**",
                f"• ⚠️ Deployment pending: {deployment_result.get('error', 'Manual setup required')}",
                "• An admin will set this up in the automation engine manually."
            ])
        
        if note:
            parts.extend(["", f"**Admin Note:** {note}"])
        
        parts.extend([
            "",
            "**Next Steps:**",
            "1. Tool is now visible in your unit's 'My Tools' tab",
            "2. An admin will configure credentials and activate the workflow",
            "3. Once activated, use the form link above to run the tool"
        ])
        
    elif action == 'reject':
        parts = [
            f"**❌ REJECTED by {admin_name}**",
            "",
            f"Your tool request for **\"{tool_name}\"** was not approved."
        ]
        
        if note:
            parts.extend(["", f"**Reason:** {note}"])
        
        parts.extend([
            "",
            "**What you can do:**",
            "• Review the feedback and make changes",
            "• Submit a revised version for approval",
            "• Ask questions in this chat if you need clarification"
        ])
        
    else:  # request_changes
        parts = [
            f"**🔄 CHANGES REQUESTED by {admin_name}**",
            "",
            f"Your tool **\"{tool_name}\"** needs some adjustments before approval."
        ]
        
        if note:
            parts.extend(["", f"**Requested Changes:** {note}"])
        
        parts.extend([
            "",
            "**Next Steps:**",
            "• Make the requested changes to your tool",
            "• Describe what you've modified",
            "• Submit for approval again"
        ])
    
    return "\n".join(parts)

# ==================== ADMIN ROUTES ====================

@router.get("/admins", response_model=List[AdminResponse])
async def list_admins(request: Request):
    """List all FlowForge admins"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Only super_admin or company_admin can see all admins
    if user.get('role') not in ['super_admin', 'company_admin']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = sb.table('flowforge_admins').select('*').eq('is_active', True).execute()
    
    return result.data or []

@router.post("/admins", response_model=AdminResponse)
async def add_admin(data: AdminCreate, request: Request):
    """Add a new FlowForge admin"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Only super_admin can add admins
    if user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admins can add admins")
    
    # Check if user is already an admin for this unit
    existing = sb.table('flowforge_admins').select('*').eq('user_id', data.user_id).eq('unit', data.unit).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="User is already an admin for this unit")
    
    admin_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    admin_doc = {
        'id': admin_id,
        'user_id': data.user_id,
        'user_name': data.user_name,
        'user_email': data.user_email,
        'admin_type': data.admin_type,
        'unit': data.unit if data.admin_type == 'unit_admin' else None,
        'assigned_by': user['user_id'],
        'is_active': True,
        'created_at': now
    }
    
    result = sb.table('flowforge_admins').insert(admin_doc).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to add admin")
    
    return result.data[0]

@router.delete("/admins/{admin_id}")
async def remove_admin(admin_id: str, request: Request):
    """Remove a FlowForge admin"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Only super_admin can remove admins
    if user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admins can remove admins")
    
    # Soft delete
    result = sb.table('flowforge_admins').update({'is_active': False}).eq('id', admin_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return {"message": "Admin removed successfully"}

@router.get("/admins/for-unit/{unit}", response_model=List[AdminResponse])
async def get_unit_admins(unit: str, request: Request):
    """Get admins for a specific unit"""
    await get_current_user_from_request(request)  # Ensure authenticated
    sb = ensure_supabase()
    
    # Get unit admins + company admins
    unit_admins = sb.table('flowforge_admins').select('*').eq('unit', unit).eq('is_active', True).execute()
    company_admins = sb.table('flowforge_admins').select('*').eq('admin_type', 'company_admin').eq('is_active', True).execute()
    
    all_admins = (unit_admins.data or []) + (company_admins.data or [])
    
    # Remove duplicates
    seen = set()
    unique_admins = []
    for admin in all_admins:
        if admin['id'] not in seen:
            seen.add(admin['id'])
            unique_admins.append(admin)
    
    return unique_admins


# ==================== INTEGRATION ANALYSIS ROUTES ====================

@router.get("/integrations/available")
async def get_available_integrations(request: Request):
    """Get list of available n8n integrations/credentials"""
    await get_current_user_from_request(request)
    
    try:
        from services.n8n_deployment import get_available_credentials, KNOWN_INTEGRATIONS
        
        available_creds = await get_available_credentials()
        
        integrations = []
        for integration_id, info in KNOWN_INTEGRATIONS.items():
            cred_type = info['credential_type']
            is_available = cred_type in available_creds if cred_type else True
            
            integrations.append({
                "id": integration_id,
                "name": info['display_name'],
                "icon": info['icon'],
                "available": is_available,
                "credential_configured": is_available
            })
        
        return {
            "integrations": integrations,
            "total_configured": sum(1 for i in integrations if i['available'])
        }
    
    except Exception as e:
        logger.error(f"Error fetching integrations: {e}")
        return {"integrations": [], "error": str(e)}


@router.post("/integrations/analyze")
async def analyze_brief_integrations(request: Request, data: Dict[str, Any]):
    """Analyze a problem brief and identify required integrations"""
    await get_current_user_from_request(request)
    
    brief_text = data.get('brief', '')
    
    if not brief_text:
        raise HTTPException(status_code=400, detail="Brief text required")
    
    try:
        from services.n8n_deployment import analyze_required_integrations
        
        result = await analyze_required_integrations(brief_text)
        return result
    
    except Exception as e:
        logger.error(f"Error analyzing integrations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== INTELLIGENT WORKFLOW DESIGN ====================

class WorkflowDesignRequest(BaseModel):
    user_input: str
    voice_transcription: Optional[str] = None
    unit: str = "general"


@router.post("/design-workflow")
async def design_workflow(request: Request, data: WorkflowDesignRequest):
    """
    Use AI to analyze user input and design a complete workflow.
    Returns workflow specification with form fields, steps, and integrations.
    """
    await get_current_user_from_request(request)
    
    if not data.user_input or len(data.user_input.strip()) < 10:
        raise HTTPException(status_code=400, detail="Please provide a description of what you want to automate")
    
    try:
        from services.intelligent_workflow_designer import analyze_and_design_workflow
        
        result = await analyze_and_design_workflow(
            user_input=data.user_input,
            voice_transcription=data.voice_transcription,
            unit=data.unit
        )
        
        if result.get('success'):
            return {
                "success": True,
                "workflow": result['workflow'],
                "message": result['workflow'].get('user_message', 'Workflow designed successfully!')
            }
        else:
            return {
                "success": False,
                "error": result.get('error', 'Failed to design workflow'),
                "raw_response": result.get('raw_response')
            }
    
    except Exception as e:
        logger.error(f"Error designing workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DEPLOYED TOOLS ROUTES ====================

class DeployedToolResponse(BaseModel):
    id: str
    tool_name: str
    description: Optional[str]
    unit: str
    status: str
    engine_workflow_id: Optional[str]
    engine_workflow_url: Optional[str]
    trigger_type: Optional[str]
    trigger_description: Optional[str]
    systems_used: List[str]
    execution_count: int
    success_count: int
    error_count: int
    last_execution_at: Optional[str]
    deployed_at: Optional[str]
    created_by_name: str
    is_active: bool


@router.get("/tools", response_model=List[DeployedToolResponse])
async def list_deployed_tools(
    request: Request,
    unit: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50
):
    """List deployed tools (conversations with status = deployed or active)"""
    await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Query deployed conversations
    query = sb.table('flowforge_conversations').select('*')
    
    # Filter by unit if specified
    if unit:
        query = query.eq('unit', unit)
    
    # Filter by status - default to deployed/active tools
    if status:
        query = query.eq('status', status)
    else:
        query = query.in_('status', ['deployed', 'active'])
    
    result = query.order('deployed_at', desc=True).limit(limit).execute()
    
    tools = []
    for conv in (result.data or []):
        # Check if workflow is active in inventory
        is_active = False
        if conv.get('engine_workflow_id'):
            inv_result = sb.table('flowforge_workflow_inventory').select('is_active').eq('engine_workflow_id', conv['engine_workflow_id']).execute()
            if inv_result.data:
                is_active = inv_result.data[0].get('is_active', False)
        
        tools.append({
            "id": conv['id'],
            "tool_name": conv.get('tool_name') or 'Untitled Tool',
            "description": conv.get('description'),
            "unit": conv['unit'],
            "status": conv['status'],
            "engine_workflow_id": conv.get('engine_workflow_id'),
            "engine_workflow_url": conv.get('engine_workflow_url'),
            "trigger_type": conv.get('trigger_type'),
            "trigger_description": conv.get('trigger_description'),
            "systems_used": conv.get('systems_used', []),
            "execution_count": conv.get('execution_count', 0),
            "success_count": conv.get('success_count', 0),
            "error_count": conv.get('error_count', 0),
            "last_execution_at": conv.get('last_execution_at'),
            "deployed_at": conv.get('deployed_at'),
            "created_by_name": conv.get('created_by_name', 'Unknown'),
            "is_active": is_active
        })
    
    return tools


@router.get("/tools/{tool_id}")
async def get_deployed_tool(tool_id: str, request: Request):
    """Get details of a specific deployed tool"""
    await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    result = sb.table('flowforge_conversations').select('*').eq('id', tool_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    conv = result.data[0]
    
    # Get approval info if any
    approval_result = sb.table('flowforge_approvals').select('*').eq('conversation_id', tool_id).order('created_at', desc=True).limit(1).execute()
    approval = approval_result.data[0] if approval_result.data else None
    
    # Check inventory status
    is_active = False
    if conv.get('engine_workflow_id'):
        inv_result = sb.table('flowforge_workflow_inventory').select('is_active').eq('engine_workflow_id', conv['engine_workflow_id']).execute()
        if inv_result.data:
            is_active = inv_result.data[0].get('is_active', False)
    
    return {
        "id": conv['id'],
        "tool_name": conv.get('tool_name') or 'Untitled Tool',
        "description": conv.get('description'),
        "unit": conv['unit'],
        "status": conv['status'],
        "engine_workflow_id": conv.get('engine_workflow_id'),
        "engine_workflow_url": conv.get('engine_workflow_url'),
        "trigger_type": conv.get('trigger_type'),
        "trigger_description": conv.get('trigger_description'),
        "systems_used": conv.get('systems_used', []),
        "execution_count": conv.get('execution_count', 0),
        "success_count": conv.get('success_count', 0),
        "error_count": conv.get('error_count', 0),
        "last_execution_at": conv.get('last_execution_at'),
        "deployed_at": conv.get('deployed_at'),
        "created_by_name": conv.get('created_by_name', 'Unknown'),
        "created_at": conv.get('created_at'),
        "is_active": is_active,
        "approval": {
            "status": approval['status'],
            "decided_by_name": approval.get('decided_by_name'),
            "decided_at": approval.get('decided_at'),
            "decision_note": approval.get('decision_note')
        } if approval else None
    }


@router.post("/tools/{tool_id}/activate")
async def activate_tool(tool_id: str, request: Request, active: bool = True):
    """Activate or deactivate a deployed tool in n8n"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Check admin permissions
    if user.get('role') not in ['super_admin', 'company_admin']:
        raise HTTPException(status_code=403, detail="Only admins can activate tools")
    
    # Get the conversation/tool
    result = sb.table('flowforge_conversations').select('*').eq('id', tool_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    conv = result.data[0]
    
    if not conv.get('engine_workflow_id'):
        raise HTTPException(status_code=400, detail="Tool has not been deployed to automation engine")
    
    # Activate in n8n
    try:
        from services.n8n_deployment import activate_n8n_workflow
        
        result = await activate_n8n_workflow(conv['engine_workflow_id'], active)
        
        if result.get('success'):
            # Update inventory
            sb.table('flowforge_workflow_inventory').update({
                'is_active': active
            }).eq('engine_workflow_id', conv['engine_workflow_id']).execute()
            
            # Update conversation status
            new_status = 'active' if active else 'deployed'
            sb.table('flowforge_conversations').update({
                'status': new_status,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', tool_id).execute()
            
            return {
                "message": f"Tool {'activated' if active else 'deactivated'} successfully",
                "is_active": active
            }
        else:
            raise HTTPException(status_code=500, detail=result.get('error', 'Failed to update workflow'))
    
    except Exception as e:
        logger.error(f"Error activating tool: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ToolExecutionRequest(BaseModel):
    form_data: Dict[str, Any]


@router.post("/tools/{tool_id}/execute")
async def execute_tool(tool_id: str, data: ToolExecutionRequest, request: Request):
    """
    Execute a deployed tool by triggering its n8n workflow.
    This is the portal-native alternative to n8n forms.
    """
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Get the tool/conversation
    result = sb.table('flowforge_conversations').select('*').eq('id', tool_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    tool = result.data[0]
    
    if not tool.get('engine_workflow_id'):
        raise HTTPException(status_code=400, detail="Tool has not been deployed to automation engine")
    
    # Get the workflow details from n8n to find the webhook URL
    try:
        from services.n8n_deployment import execute_n8n_workflow
        
        execution_result = await execute_n8n_workflow(
            workflow_id=tool['engine_workflow_id'],
            input_data=data.form_data,
            user_id=user['user_id'],
            user_name=user['name']
        )
        
        # Update execution stats
        now = datetime.now(timezone.utc).isoformat()
        update_data = {
            'execution_count': (tool.get('execution_count') or 0) + 1,
            'last_execution_at': now,
            'updated_at': now
        }
        
        if execution_result.get('success'):
            update_data['success_count'] = (tool.get('success_count') or 0) + 1
        else:
            update_data['error_count'] = (tool.get('error_count') or 0) + 1
        
        sb.table('flowforge_conversations').update(update_data).eq('id', tool_id).execute()
        
        if execution_result.get('success'):
            return {
                "success": True,
                "message": "Tool executed successfully!",
                "result": execution_result.get('data'),
                "execution_id": execution_result.get('execution_id')
            }
        else:
            raise HTTPException(
                status_code=500, 
                detail=execution_result.get('error', 'Tool execution failed')
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing tool: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tools/{tool_id}/form-fields")
async def get_tool_form_fields(tool_id: str, request: Request):
    """Get the form fields for a tool to render in the portal"""
    await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Get the tool
    result = sb.table('flowforge_conversations').select('*').eq('id', tool_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    tool = result.data[0]
    
    # Get the approval to find the form fields
    approval_result = sb.table('flowforge_approvals').select('*').eq('conversation_id', tool_id).order('created_at', desc=True).limit(1).execute()
    
    form_fields = []
    if approval_result.data:
        approval = approval_result.data[0]
        request_details = approval.get('request_details') or {}
        form_fields = request_details.get('form_fields') or []
        
        # Also check proposed_workflow_json
        if not form_fields:
            workflow_json = approval.get('proposed_workflow_json') or {}
            form_fields = workflow_json.get('form_fields') or []
    
    return {
        "tool_id": tool_id,
        "tool_name": tool.get('tool_name', 'Untitled Tool'),
        "form_fields": form_fields,
        "trigger_type": tool.get('trigger_type', 'form')
    }

# ==================== INTEGRATION ROUTES ====================

@router.get("/integrations", response_model=List[IntegrationResponse])
async def list_integrations(request: Request):
    """List all available integrations and their status"""
    await get_current_user_from_request(request)  # Ensure authenticated
    sb = ensure_supabase()
    
    result = sb.table('flowforge_integrations').select('*').execute()
    
    return result.data or []

@router.post("/integrations/check")
async def check_integrations(request: Request, integration_types: List[str]):
    """Check if specific integrations are available"""
    await get_current_user_from_request(request)  # Ensure authenticated
    sb = ensure_supabase()
    
    result = sb.table('flowforge_integrations').select('*').in_('internal_type', integration_types).execute()
    
    # Build response with status for each requested type
    status_map = {}
    for integration in (result.data or []):
        status_map[integration['internal_type']] = {
            'display_name': integration['display_name'],
            'status': integration['status'],
            'icon': integration['icon']
        }
    
    # Add 'not_found' for missing integrations
    for itype in integration_types:
        if itype not in status_map:
            status_map[itype] = {
                'display_name': itype,
                'status': 'not_found',
                'icon': None
            }
    
    return status_map

@router.post("/integrations/sync")
async def sync_integrations(request: Request):
    """Sync integration status from n8n"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    if user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Only super admins can sync integrations")
    
    if not N8N_BASE_URL or not N8N_API_KEY:
        raise HTTPException(status_code=503, detail="n8n configuration not available")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{N8N_BASE_URL}/api/v1/credentials",
                headers={"X-N8N-API-KEY": N8N_API_KEY},
                timeout=30
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to fetch credentials from automation engine")
            
            credentials = response.json().get('data', [])
            
            # Update integration statuses
            now = datetime.now(timezone.utc).isoformat()
            for cred in credentials:
                # Try to update existing or insert new
                sb.table('flowforge_integrations').upsert({
                    'internal_type': cred.get('type', ''),
                    'display_name': cred.get('name', cred.get('type', '')),
                    'credential_name': cred.get('name', ''),
                    'status': 'connected',
                    'last_verified_at': now,
                    'updated_at': now
                }, on_conflict='internal_type').execute()
            
            return {"message": f"Synced {len(credentials)} credentials from automation engine"}
    
    except httpx.RequestError as e:
        logger.error(f"Failed to sync integrations: {e}")
        raise HTTPException(status_code=502, detail="Failed to connect to automation engine")

# ==================== WORKFLOW INVENTORY ROUTES ====================

@router.get("/inventory", response_model=List[WorkflowInventoryResponse])
async def list_workflow_inventory(
    request: Request,
    unit: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """List all workflows in the inventory"""
    await get_current_user_from_request(request)  # Ensure authenticated
    sb = ensure_supabase()
    
    query = sb.table('flowforge_workflow_inventory').select('*')
    
    if unit:
        query = query.eq('unit', unit)
    
    result = query.order('name').range(offset, offset + limit - 1).execute()
    
    return result.data or []

@router.post("/inventory/sync")
async def sync_workflow_inventory(request: Request):
    """Sync workflow inventory from n8n"""
    await get_current_user_from_request(request)  # Ensure authenticated
    sb = ensure_supabase()
    
    if not N8N_BASE_URL or not N8N_API_KEY:
        raise HTTPException(status_code=503, detail="n8n configuration not available")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{N8N_BASE_URL}/api/v1/workflows",
                headers={"X-N8N-API-KEY": N8N_API_KEY},
                timeout=30
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to fetch workflows from automation engine")
            
            workflows = response.json().get('data', [])
            now = datetime.now(timezone.utc).isoformat()
            
            synced_count = 0
            for wf in workflows:
                # Extract node types
                nodes = wf.get('nodes', [])
                node_types = list(set([n.get('type', '') for n in nodes]))
                nodes_summary = ', '.join(node_types[:10])  # Limit to first 10
                
                # Determine trigger type
                trigger_type = None
                for node in nodes:
                    if 'trigger' in node.get('type', '').lower():
                        trigger_type = node.get('type', '')
                        break
                
                # Handle case where meta might be None
                meta = wf.get('meta') or {}
                
                inventory_doc = {
                    'engine_workflow_id': wf.get('id', ''),
                    'name': wf.get('name', 'Untitled'),
                    'description': meta.get('description', '') if isinstance(meta, dict) else '',
                    'nodes_summary': nodes_summary,
                    'trigger_type': trigger_type,
                    'is_active': wf.get('active', False),
                    'tags': [t.get('name', '') for t in (wf.get('tags') or [])],
                    'is_flowforge_created': False,  # Will be updated if linked to conversation
                    'last_synced_at': now,
                    'engine_created_at': wf.get('createdAt'),
                    'engine_updated_at': wf.get('updatedAt')
                }
                
                # Upsert by engine_workflow_id
                sb.table('flowforge_workflow_inventory').upsert(
                    inventory_doc, 
                    on_conflict='engine_workflow_id'
                ).execute()
                synced_count += 1
            
            return {"message": f"Synced {synced_count} workflows from automation engine"}
    
    except httpx.RequestError as e:
        logger.error(f"Failed to sync inventory: {e}")
        raise HTTPException(status_code=502, detail="Failed to connect to automation engine")

@router.post("/inventory/search")
async def search_inventory(request: Request, query: str, limit: int = 10):
    """Search workflow inventory for similar workflows"""
    await get_current_user_from_request(request)  # Ensure authenticated
    sb = ensure_supabase()
    
    # Simple text search - in production, this would use semantic similarity
    result = sb.table('flowforge_workflow_inventory').select('*').or_(
        f"name.ilike.%{query}%,description.ilike.%{query}%,nodes_summary.ilike.%{query}%"
    ).limit(limit).execute()
    
    return result.data or []

# ==================== AI GENERATION ROUTES ====================

class GenerateRequest(BaseModel):
    conversation_id: str
    message: str
    include_history: bool = True
    check_duplicates: bool = True

class GenerateResponse(BaseModel):
    content: str
    has_workflow: bool = False
    workflow_data: Optional[Dict[str, Any]] = None
    has_action_buttons: bool = False
    action_buttons: Optional[List[Dict[str, Any]]] = None
    has_duplicate_alert: bool = False
    duplicate_data: Optional[Dict[str, Any]] = None

@router.post("/generate", response_model=GenerateResponse)
async def generate_workflow(data: GenerateRequest, request: Request, background_tasks: BackgroundTasks):
    """Generate AI response for workflow building - uses background task for long-running AI"""
    user = await get_current_user_from_request(request)
    sb = ensure_supabase()
    
    # Get conversation
    conv_result = sb.table('flowforge_conversations').select('*').eq('id', data.conversation_id).execute()
    if not conv_result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = conv_result.data[0]
    
    # Check access
    if user.get('role') not in ['super_admin', 'company_admin']:
        if conversation['created_by'] != user['user_id']:
            raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Import AI service
        from services.flowforge_ai import generate_ai_response
        
        # Get conversation history if needed
        history = []
        is_first_message = True
        if data.include_history:
            msg_result = sb.table('flowforge_messages').select('role,content').eq('conversation_id', data.conversation_id).order('message_index').execute()
            history = msg_result.data or []
            user_messages = [m for m in history if m['role'] == 'user']
            is_first_message = len(user_messages) <= 1
        
        # For builds (first message with structured brief), process synchronously but with timeout handling
        # This ensures immediate feedback while tolerating longer processing times
        try:
            response = await asyncio.wait_for(
                generate_ai_response(
                    conversation_id=data.conversation_id,
                    unit=conversation['unit'],
                    user_message=data.message,
                    conversation_history=history,
                    tool_status=conversation['status'],
                    execution_count=conversation.get('execution_count', 0),
                    last_error=conversation.get('last_error_message'),
                    check_duplicates=data.check_duplicates,
                    is_first_message=is_first_message
                ),
                timeout=150.0  # 2.5 minute timeout
            )
            return response
            
        except asyncio.TimeoutError:
            logger.warning(f"AI generation timed out for conversation {data.conversation_id}")
            # Return a "still processing" response that the frontend can handle
            return GenerateResponse(
                content="⏳ **Your automation is taking longer than expected to generate.**\n\nThis happens occasionally with complex requests. Your brief has been saved and the system is still working on it.\n\n**Please refresh this page in 30-60 seconds** to see the result, or try sending another message.",
                has_workflow=False,
                has_action_buttons=True,
                action_buttons=[
                    {"label": "Refresh Page", "action": "refresh", "primary": True},
                    {"label": "Try Again", "action": "retry_generation", "primary": False}
                ]
            )
    
    except Exception as e:
        logger.error(f"AI generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")

# ==================== HEALTH CHECK ====================

@router.get("/health")
async def health_check():
    """Health check for FlowForge service"""
    status = {
        "status": "healthy",
        "supabase": "connected" if supabase else "disconnected",
        "n8n": "configured" if N8N_BASE_URL and N8N_API_KEY else "not_configured"
    }
    
    # Test Supabase connection
    if supabase:
        try:
            supabase.table('flowforge_conversations').select('id').limit(1).execute()
        except Exception as e:
            status["supabase"] = f"error: {str(e)}"
            status["status"] = "degraded"
    
    return status

# ==================== VOICE TRANSCRIPTION ====================

class TranscriptionResponse(BaseModel):
    text: str
    duration_seconds: Optional[float] = None
    language: Optional[str] = None

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    request: Request,
    audio: UploadFile = File(...)
):
    """
    Transcribe audio file to text using OpenAI Whisper
    Supports: mp3, mp4, mpeg, mpga, m4a, wav, webm (max 25MB)
    """
    await get_current_user_from_request(request)  # Ensure authenticated
    
    # Validate file type
    allowed_types = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a']
    allowed_extensions = ['.webm', '.wav', '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a']
    
    file_ext = os.path.splitext(audio.filename or '')[1].lower()
    
    if audio.content_type not in allowed_types and file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported audio format. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Check file size (25MB limit)
    contents = await audio.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large. Maximum size is 25MB.")
    
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
        from dotenv import load_dotenv
        load_dotenv()
        
        EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=503, detail="Voice processing service not configured")
        
        # Initialize the STT service
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        
        # Create a temporary file for the audio
        suffix = file_ext if file_ext else '.webm'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
            tmp_file.write(contents)
            tmp_path = tmp_file.name
        
        try:
            # Transcribe the audio
            with open(tmp_path, 'rb') as audio_file:
                response = await stt.transcribe(
                    file=audio_file,
                    model="whisper-1",
                    response_format="verbose_json",
                    language="en"  # Default to English, could be made configurable
                )
            
            # Extract duration if available
            duration = None
            if hasattr(response, 'duration'):
                duration = response.duration
            
            return TranscriptionResponse(
                text=response.text,
                duration_seconds=duration,
                language="en"
            )
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    except ImportError as e:
        logger.error(f"Missing dependency for transcription: {e}")
        raise HTTPException(status_code=503, detail="Voice processing service unavailable")
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to transcribe audio: {str(e)}")

