"""
FlowForge AI Service
Uses Emergent LLM integration for workflow generation with Claude
"""

import os
import json
import logging
from typing import Optional, Dict, Any, List
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Get API key from environment
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# FlowForge System Prompt
FLOWFORGE_SYSTEM_PROMPT = """You are FlowForge, THCO's internal automation builder. You live inside thcoteam.com 
and help team members build, deploy, and maintain automations through natural conversation.

## YOUR PERSONALITY
- Conversational, competent, helpful
- You're a colleague, not a robot
- You generate workflows as soon as you have enough info
- When a user returns, you greet naturally and show current tool status
- You own mistakes and fix them quickly

## CRITICAL RULES

### NEVER Expose Underlying Technology
- NEVER say "n8n" — say "THCO automation engine" or just "automation engine"
- NEVER say "n8n workflow" — say "automation" or "tool"
- NEVER say "n8n node" — say "step" or "action"
- NEVER say "n8n credential" — say "service connection" or "integration"
- NEVER say "Claude" or "Anthropic" — say "AI" or "AI text generation"
- NEVER say "Supabase" to the user — say "database" or "THCO database"
- NEVER say "Deepgram" or "Whisper" — say "voice processing"
- NEVER expose JSON, API details, or technical architecture to end users
- The user sees: FlowForge, THCO Automation Engine, and friendly integration names

### Integration Display Names
Use ONLY these user-facing names:
- Database Access (not Supabase/PostgreSQL)
- Email Sending (Gmail)
- Calendar Access (Google Calendar)
- Spreadsheet Access (Google Sheets)
- Team Notifications (Slack)
- WhatsApp Messaging
- LinkedIn Integration
- AI Text Generation
- Voice Processing
- External API Connection
- Scheduled Automation

### Approval Flow
- NEVER deploy directly. Always say "submit for approval"
- After generating a workflow, offer: "Submit for Approval" or "Make Changes"
- When approval is received, post the decision in the conversation

## MOST IMPORTANT: RECOGNIZING STRUCTURED BRIEFS (FORM SUBMISSIONS)

When the user's message contains these markers:
- **TOOL NAME:**
- **THE PROBLEM:**
- **THE TRIGGER:**
- **THE STEPS:**
- **THE OUTCOME:**
- **HOW OFTEN:**

THIS IS A STRUCTURED BRIEF from the Problem Brief Form. The user has ALREADY filled out a detailed form with all the information you need.

### CRITICAL: DO NOT ASK QUESTIONS ABOUT STRUCTURED BRIEFS
When you see a structured brief:
1. NEVER ask "What should be the tool name?" — the name is in **TOOL NAME:**
2. NEVER ask "What triggers this?" — it's in **THE TRIGGER:**
3. NEVER ask "How often does this run?" — it's in **HOW OFTEN:**
4. DO NOT ask ANY clarifying questions — you have COMPLETE information

Instead, IMMEDIATELY:
1. Acknowledge the brief briefly ("Got it! Building your automation...")
2. Generate the workflow structure
3. Show the preview with steps
4. Offer "Submit for Approval" or "Make Changes"

### CONVERSATION FLOW ORDER
For CASUAL messages (short, vague requests):
1. Ask clarifying questions (2-3 max)
2. Generate workflow
3. Show preview with steps
4. Offer: "Submit for Approval" or "Make Changes"

For STRUCTURED BRIEFS (complete form submissions with **TOOL NAME:**, **THE PROBLEM:**, etc.):
1. Say something like "Got it! Here's the automation I'm building for you..."
2. IMMEDIATELY generate the workflow — NO questions
3. Show preview with steps
4. Offer: "Submit for Approval" or "Make Changes"

## OUTPUT FORMAT FOR WORKFLOW
When generating a workflow, respond with a JSON block like this (embedded in your response):

```workflow
{
  "tool_name": "Use the name from **TOOL NAME:** in the brief",
  "description": "What this tool does",
  "trigger_type": "scheduled|manual|webhook",
  "trigger_description": "From **THE TRIGGER:** in the brief",
  "systems_used": ["Database Access", "Email Sending", "AI Text Generation"],
  "steps": [
    {"step_number": 1, "name": "Step Name", "description": "What this step does"},
    {"step_number": 2, "name": "Step Name", "description": "What this step does"}
  ],
  "estimated_impact": "~5-15 emails per day"
}
```

Always wrap workflow JSON in ```workflow ... ``` blocks so it can be parsed.
"""

class FlowForgeAI:
    """FlowForge AI Service using Emergent LLM integration"""
    
    def __init__(self, conversation_id: str, unit: str):
        self.conversation_id = conversation_id
        self.unit = unit
        
        if not EMERGENT_LLM_KEY:
            raise ValueError("EMERGENT_LLM_KEY not found in environment")
        
        # Initialize the LLM chat with Claude
        self.chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"flowforge-{conversation_id}",
            system_message=FLOWFORGE_SYSTEM_PROMPT
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    
    async def send_message(
        self, 
        user_message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send a message to the AI and get a response
        
        Args:
            user_message: The user's message
            context: Optional context including conversation history, tool status, etc.
        
        Returns:
            Dict containing the AI response and any extracted workflow data
        """
        try:
            # Build the message with context
            full_message = self._build_context_message(user_message, context)
            
            # Create user message
            message = UserMessage(text=full_message)
            
            # Send to AI
            response = await self.chat.send_message(message)
            
            # Parse the response for any workflow JSON
            workflow_data = self._extract_workflow_data(response)
            
            return {
                "content": response,
                "has_workflow": workflow_data is not None,
                "workflow_data": workflow_data,
                "has_action_buttons": workflow_data is not None,
                "action_buttons": self._get_action_buttons(workflow_data) if workflow_data else None
            }
        
        except Exception as e:
            logger.error(f"FlowForge AI error: {e}")
            raise
    
    def _build_context_message(
        self, 
        user_message: str, 
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Build the full message with context"""
        parts = []
        
        if context:
            # Add unit context
            if "unit" in context:
                parts.append(f"[Building for unit: {context['unit']}]")
            
            # Add tool status if returning to conversation
            if context.get("tool_status"):
                parts.append(f"[Current tool status: {context['tool_status']}]")
            
            # Add execution history if available
            if context.get("execution_summary"):
                parts.append(f"[Recent executions: {context['execution_summary']}]")
            
            # Add any errors
            if context.get("last_error"):
                parts.append(f"[Last error: {context['last_error']}]")
        
        parts.append(user_message)
        
        return "\n".join(parts)
    
    def _extract_workflow_data(self, response: str) -> Optional[Dict[str, Any]]:
        """Extract workflow JSON from the response"""
        try:
            # Look for ```workflow ... ``` blocks
            import re
            pattern = r'```workflow\s*([\s\S]*?)\s*```'
            match = re.search(pattern, response)
            
            if match:
                workflow_json = match.group(1).strip()
                return json.loads(workflow_json)
            
            return None
        except json.JSONDecodeError:
            logger.warning("Failed to parse workflow JSON from response")
            return None
    
    def _get_action_buttons(self, workflow_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate action buttons for workflow preview"""
        return [
            {
                "label": "Submit for Approval",
                "action": "submit_approval",
                "primary": True,
                "icon": "check"
            },
            {
                "label": "Make Changes",
                "action": "request_changes",
                "primary": False,
                "icon": "edit"
            }
        ]


def _is_structured_brief(user_message: str) -> bool:
    """
    Check if the message is a structured brief from the ProblemBriefForm.
    
    A structured brief contains these specific markers from the form:
    - **TOOL NAME:**
    - **THE PROBLEM:**
    - **THE TRIGGER:**
    - **THE STEPS:**
    - **THE OUTCOME:**
    - **HOW OFTEN:**
    """
    # These are the required markers from the ProblemBriefForm
    required_markers = [
        '**TOOL NAME:**',
        '**THE PROBLEM:**',
        '**THE TRIGGER:**',
        '**THE STEPS:**',
        '**THE OUTCOME:**',
        '**HOW OFTEN:**'
    ]
    
    # Count how many markers are present
    markers_found = sum(1 for marker in required_markers if marker in user_message)
    
    # If at least 4 of 6 required markers are found, it's a structured brief
    return markers_found >= 4


def _should_trigger_two_step(user_message: str, conversation_history: List[Dict[str, Any]] = None) -> bool:
    """
    Determine if the two-step build process should be triggered.
    
    IMMEDIATELY triggers for:
    1. Structured briefs (form submissions with **TOOL NAME:**, **THE PROBLEM:**, etc.)
    
    Also triggers when:
    2. The user has provided enough context (e.g., answered clarifying questions)
    3. The message contains automation-related keywords
    4. There are at least 2 exchanges in the conversation
    
    Returns False for:
    - Very short messages (likely clarifying questions)
    - First message without enough context
    - Messages that are questions to the AI
    """
    # CRITICAL: Always trigger for structured briefs (form submissions)
    # This is the highest priority check - forms have all the data we need
    if _is_structured_brief(user_message):
        logger.info("[FlowForge] Detected structured brief from form - triggering two-step build")
        return True
    
    # If no history, check if the message is detailed enough
    if not conversation_history:
        # Require at least 50 characters for first message
        if len(user_message) < 50:
            return False
        
        # Check for automation-related keywords
        automation_keywords = [
            'automat', 'workflow', 'trigger', 'schedule', 'notify', 'alert',
            'send', 'email', 'update', 'create', 'generate', 'report',
            'daily', 'weekly', 'when', 'every', 'follow', 'track', 'monitor'
        ]
        has_keywords = any(kw in user_message.lower() for kw in automation_keywords)
        
        # For first message, require keywords AND decent length
        return has_keywords and len(user_message) >= 80
    
    # If there's conversation history, we likely have enough context
    user_messages = [m for m in conversation_history if m.get('role') == 'user']
    
    # After at least 2 user messages, assume we have context
    if len(user_messages) >= 2:
        return True
    
    # Check the current message for "build this" signals
    build_signals = [
        'yes', 'go ahead', 'build', 'create', 'make', 'that', 'sounds good',
        'let\'s do', 'proceed', 'approved', 'confirm', 'all of', 'exactly'
    ]
    has_build_signal = any(sig in user_message.lower() for sig in build_signals)
    
    return has_build_signal


async def generate_ai_response(
    conversation_id: str,
    unit: str,
    user_message: str,
    conversation_history: List[Dict[str, Any]] = None,
    tool_status: str = None,
    execution_count: int = 0,
    last_error: str = None,
    check_duplicates: bool = True,
    is_first_message: bool = False,
    use_two_step: bool = True,  # New parameter for two-step process
    voice_transcription: str = None  # Voice input support
) -> Dict[str, Any]:
    """
    High-level function to generate an AI response for FlowForge
    
    Uses the two-step Prompt Engineering process:
    1. Prompt Architect - Creates detailed Build Specification
    2. Workflow Builder - Generates workflow from spec
    
    Args:
        conversation_id: The conversation ID
        unit: The business unit
        user_message: The user's message
        conversation_history: Previous messages in the conversation
        tool_status: Current status of the tool
        execution_count: Number of times the tool has run
        last_error: Last error message if any
        check_duplicates: Whether to check for duplicates first
        is_first_message: Whether this is the first user message
        use_two_step: Whether to use the two-step build process
        voice_transcription: Optional voice transcription to include
    
    Returns:
        Dict containing the AI response and metadata
    """
    # Check for duplicates on first meaningful message
    duplicate_data = None
    if check_duplicates and is_first_message:
        try:
            from services.duplicate_detection import check_for_duplicates, generate_duplicate_alert_data
            
            has_strong_match, similar_workflows = await check_for_duplicates(user_message, unit)
            
            if similar_workflows:
                strongest = similar_workflows[0]
                duplicate_data = generate_duplicate_alert_data(similar_workflows, strongest)
                
                # If strong match, return duplicate alert instead of generating workflow
                if has_strong_match:
                    return {
                        "content": f"Before I build something new, I found an existing tool that looks very similar to what you're describing:\n\n**{strongest['name']}**\n{strongest.get('description', 'No description')}\n\nDoes this match what you need?",
                        "has_workflow": False,
                        "workflow_data": None,
                        "has_action_buttons": False,
                        "action_buttons": None,
                        "has_duplicate_alert": True,
                        "duplicate_data": duplicate_data
                    }
                # Weak matches are handled after AI response
        except Exception as e:
            logger.warning(f"Duplicate detection failed: {e}")
    
    # Determine if we should use two-step process
    # Use two-step when we have enough context to build (not just clarifying questions)
    should_use_two_step = use_two_step and _should_trigger_two_step(user_message, conversation_history)
    
    if should_use_two_step:
        # Use the Two-Step Prompt Engineering Process
        try:
            from services.prompt_engineering import generate_workflow_two_step
            
            logger.info(f"[FlowForge] Using two-step build process for {unit}")
            
            response = await generate_workflow_two_step(
                conversation_id=conversation_id,
                unit=unit,
                user_description=user_message,
                voice_transcription=voice_transcription,
                conversation_history=conversation_history
            )
            
            # Add duplicate data if present (weak matches)
            if duplicate_data and not duplicate_data.get('has_strong_match'):
                response["has_duplicate_alert"] = True
                response["duplicate_data"] = duplicate_data
            
            return response
            
        except Exception as e:
            logger.error(f"Two-step generation failed, falling back to standard: {e}")
            # Fall through to standard generation
    
    # Standard single-step generation (for clarifying questions, etc.)
    ai = FlowForgeAI(conversation_id, unit)
    
    context = {
        "unit": unit,
        "tool_status": tool_status,
        "execution_count": execution_count,
        "last_error": last_error
    }
    
    if execution_count > 0:
        context["execution_summary"] = f"{execution_count} executions"
    
    response = await ai.send_message(user_message, context)
    
    # Add duplicate data if present (weak matches)
    if duplicate_data and not duplicate_data.get('has_strong_match'):
        response["has_duplicate_alert"] = True
        response["duplicate_data"] = duplicate_data
    
    # Check integrations if workflow was generated with systems_used
    if response.get('has_workflow') and response.get('workflow_data'):
        systems_used = response['workflow_data'].get('systems_used', [])
        if systems_used:
            try:
                integration_check = await check_integration_status(systems_used)
                if integration_check:
                    response["has_integration_check"] = True
                    response["integration_check_data"] = integration_check
            except Exception as e:
                logger.warning(f"Integration check failed: {e}")
    
    return response


async def check_integration_status(systems_used: List[str]) -> Optional[Dict[str, Any]]:
    """
    Check the status of required integrations
    Maps display names to internal types and checks their status in the database
    """
    import os
    from supabase import create_client
    
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Map display names to internal types
    name_to_type = {
        "database access": "database",
        "email sending": "gmail",
        "email sending (gmail)": "gmail",
        "calendar access": "google_calendar",
        "google calendar": "google_calendar",
        "spreadsheet access": "google_sheets",
        "google sheets": "google_sheets",
        "team notifications": "slack",
        "team notifications (slack)": "slack",
        "slack": "slack",
        "whatsapp messaging": "whatsapp",
        "whatsapp": "whatsapp",
        "linkedin integration": "linkedin",
        "linkedin": "linkedin",
        "ai text generation": "ai_text",
        "ai": "ai_text",
        "voice processing": "voice_processing",
        "voice": "voice_processing",
        "external api connection": "http_request",
        "http": "http_request",
        "api": "http_request",
        "scheduled automation": "scheduled",
        "scheduled": "scheduled",
    }
    
    # Normalize and map systems to internal types
    internal_types = []
    for system in systems_used:
        normalized = system.lower().strip()
        if normalized in name_to_type:
            internal_types.append(name_to_type[normalized])
        else:
            # Try partial matching
            for key, value in name_to_type.items():
                if key in normalized or normalized in key:
                    internal_types.append(value)
                    break
    
    if not internal_types:
        return None
    
    # Get integration statuses from database
    result = supabase.table('flowforge_integrations').select('*').in_('internal_type', internal_types).execute()
    
    integrations = []
    has_issues = False
    
    for internal_type in internal_types:
        # Find matching integration
        found = None
        for integration in (result.data or []):
            if integration['internal_type'] == internal_type:
                found = integration
                break
        
        if found:
            status = found['status']
            if status != 'connected':
                has_issues = True
            
            integrations.append({
                "type": internal_type,
                "display_name": found['display_name'],
                "status": status,
                "icon": found.get('icon')
            })
        else:
            has_issues = True
            # Find original display name
            original_name = next((s for s in systems_used if name_to_type.get(s.lower().strip()) == internal_type), internal_type)
            integrations.append({
                "type": internal_type,
                "display_name": original_name,
                "status": "not_found",
                "icon": None
            })
    
    return {
        "integrations": integrations,
        "has_issues": has_issues,
        "all_connected": not has_issues
    }
