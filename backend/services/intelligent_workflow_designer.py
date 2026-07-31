"""
FlowForge Intelligent Workflow Designer
Uses Claude to analyze user briefs and generate complete n8n workflow configurations.
"""

import os
import json
import logging
import re
from typing import Optional, Dict, Any, List
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# ═══════════════════════════════════════════════════════════════════
# AVAILABLE N8N INTEGRATIONS (discovered from your n8n instance)
# ═══════════════════════════════════════════════════════════════════

N8N_INTEGRATIONS = {
    "gmail": {
        "display_name": "Gmail",
        "description": "Send and manage emails via Gmail",
        "credential_type": "gmailOAuth2",
        "credential_id": "2krXKk57BMcPp5VE",
        "credential_name": "Gmail account",
        "node_type": "n8n-nodes-base.gmail",
        "capabilities": ["send_email", "read_email", "draft_email"],
        "keywords": ["email", "gmail", "send email", "mail", "message", "notify"]
    },
    "google_sheets": {
        "display_name": "Google Sheets",
        "description": "Read and write data to Google Spreadsheets",
        "credential_type": "googleSheetsOAuth2Api",
        "credential_id": "BmvjiSGGL4BUli5K",
        "credential_name": "Google Sheets account",
        "node_type": "n8n-nodes-base.googleSheets",
        "capabilities": ["read_sheet", "write_sheet", "update_sheet", "append_row"],
        "keywords": ["spreadsheet", "sheet", "google sheets", "excel", "csv", "data", "list", "table"]
    },
    "google_drive": {
        "display_name": "Google Drive",
        "description": "Access and manage files in Google Drive",
        "credential_type": "googleDriveOAuth2Api",
        "credential_id": "4nfvLJ0xJcEwxInL",
        "credential_name": "Google Drive account",
        "node_type": "n8n-nodes-base.googleDrive",
        "capabilities": ["upload_file", "download_file", "list_files", "create_folder"],
        "keywords": ["drive", "google drive", "file", "upload", "download", "document", "folder"]
    },
    "anthropic_ai": {
        "display_name": "AI Text Generation (Claude)",
        "description": "Generate text, analyze content, and create responses using Claude AI",
        "credential_type": "anthropicApi",
        "credential_id": "864L0hXInc4QyBSn",
        "credential_name": "Anthropic account",
        "node_type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
        "capabilities": ["generate_text", "analyze_text", "summarize", "translate", "personalize"],
        "keywords": ["ai", "generate", "write", "create", "personalize", "analyze", "summarize", "claude", "text generation"]
    },
    "openai": {
        "display_name": "AI Text Generation (OpenAI)",
        "description": "Generate text using GPT models",
        "credential_type": "openAiApi",
        "credential_id": "bCh7nG0FOnI4xU4R",
        "credential_name": "OpenAi account",
        "node_type": "@n8n/n8n-nodes-langchain.openAi",
        "capabilities": ["generate_text", "chat", "analyze"],
        "keywords": ["openai", "gpt", "chatgpt"]
    },
    "http_request": {
        "display_name": "HTTP / API Request",
        "description": "Make HTTP requests to external APIs",
        "credential_type": None,
        "credential_id": None,
        "credential_name": None,
        "node_type": "n8n-nodes-base.httpRequest",
        "capabilities": ["api_call", "webhook", "fetch_data"],
        "keywords": ["api", "http", "request", "fetch", "external", "webhook", "rest"]
    },
    "code": {
        "display_name": "Custom Code",
        "description": "Run custom JavaScript code for data transformation",
        "credential_type": None,
        "credential_id": None,
        "credential_name": None,
        "node_type": "n8n-nodes-base.code",
        "capabilities": ["transform_data", "filter", "calculate", "format"],
        "keywords": ["code", "process", "transform", "filter", "calculate", "custom", "javascript"]
    },
    "database": {
        "display_name": "Database (PostgreSQL)",
        "description": "Query and update PostgreSQL database",
        "credential_type": "postgres",
        "credential_id": None,  # Not configured yet
        "credential_name": None,
        "node_type": "n8n-nodes-base.postgres",
        "capabilities": ["query", "insert", "update", "delete"],
        "keywords": ["database", "sql", "query", "postgres", "data", "record"]
    }
}

# ═══════════════════════════════════════════════════════════════════
# WORKFLOW DESIGNER SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════

WORKFLOW_DESIGNER_PROMPT = """You are an expert workflow designer for THCO's FlowForge system. 
Your job is to analyze a user's automation request and design a complete, functional workflow.

## YOUR TASK
Given a user's description of what they want to automate, you must:
1. Understand what they're trying to achieve
2. Identify the required integrations (Gmail, Google Sheets, AI, etc.)
3. Design the workflow steps
4. Define what form fields the user needs to fill out to use this tool
5. Output a structured JSON workflow specification

## AVAILABLE INTEGRATIONS
These are the integrations configured in the automation engine:

{integrations_list}

## OUTPUT FORMAT
You MUST respond with a JSON object in this EXACT format:

```json
{{
  "analysis": {{
    "understood_goal": "1-2 sentence summary of what the user wants",
    "key_requirements": ["list", "of", "requirements"],
    "identified_integrations": ["Gmail", "Google Sheets", etc.]
  }},
  "workflow_design": {{
    "name": "Clear, descriptive tool name",
    "description": "What this tool does in 1-2 sentences",
    "trigger_type": "form",
    "trigger_description": "How the user triggers this tool",
    "form_fields": [
      {{
        "name": "field_name_snake_case",
        "label": "Human Readable Label",
        "type": "text|textarea|email|number|select|date|file",
        "required": true,
        "placeholder": "Example placeholder text...",
        "help_text": "Optional help text explaining the field",
        "options": ["only", "for", "select", "type"]
      }}
    ],
    "steps": [
      {{
        "step_number": 1,
        "name": "Step Name",
        "description": "What this step does",
        "integration": "gmail|google_sheets|anthropic_ai|code|etc",
        "action": "send_email|read_sheet|generate_text|etc",
        "inputs": {{"field": "value or expression"}},
        "outputs": ["what this step produces"]
      }}
    ],
    "integrations_needed": [
      {{
        "id": "gmail",
        "display_name": "Gmail",
        "purpose": "Why this integration is needed"
      }}
    ]
  }},
  "user_message": "A friendly 2-3 sentence message explaining the workflow to the user. DO NOT use technical jargon."
}}
```

## IMPORTANT RULES

1. **Form Fields**: Design form fields that capture ALL information needed to run the automation.
   - If reading from a spreadsheet, ask for the spreadsheet URL or let them paste data
   - If sending emails, ask for recipient info or let them paste a list
   - Always include fields for any variable content

2. **Trigger Type**: Almost always use "form" so users can fill out a form to trigger the tool.
   Use "schedule" only if the user specifically says "every day", "weekly", etc.

3. **Step Design**: Each step should be atomic and clear:
   - One integration per step
   - Clear inputs and outputs
   - Include data transformation steps when needed

4. **Integration Matching**: ONLY use integrations from the available list.
   - Match keywords in user request to integration capabilities
   - If an integration isn't available, mention it in the analysis

5. **Be Practical**: Design workflows that will actually work:
   - Include error handling considerations
   - Think about edge cases
   - Keep it simple - fewer steps is better

6. **User Message**: Write a friendly, non-technical summary. Example:
   "I'll create a tool that reads your candidate list and sends personalized emails to each one. 
   Just fill out the form with your candidate info and email template, and I'll handle the rest!"

## EXAMPLES OF GOOD FORM FIELDS

For a candidate outreach tool:
- "candidate_data" (textarea): "Paste your candidate list (Name, Email, Role - one per line)"
- "email_subject" (text): "Subject line for the emails"  
- "email_tone" (select): Options: ["Professional", "Friendly", "Formal"]
- "sender_name" (text): "Your name (how you'll sign the email)"

For a report generator:
- "report_type" (select): Options: ["Weekly Summary", "Monthly Analysis", "Custom"]
- "date_range" (text): "Date range (e.g., 'Last 7 days', 'January 2024')"
- "recipients" (textarea): "Email addresses to send the report to (one per line)"
"""


class IntelligentWorkflowDesigner:
    """
    Uses Claude to analyze user requests and generate complete workflow specifications.
    """
    
    def __init__(self, unit: str = "general"):
        self.unit = unit
        
        if not EMERGENT_LLM_KEY:
            raise ValueError("EMERGENT_LLM_KEY not found")
        
        # Build integrations list for the prompt
        integrations_list = self._format_integrations_for_prompt()
        
        system_prompt = WORKFLOW_DESIGNER_PROMPT.format(
            integrations_list=integrations_list
        )
        
        # Use Claude Sonnet for better reasoning
        self.chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"workflow-designer-{unit}",
            system_message=system_prompt
        ).with_model("anthropic", "claude-sonnet-4-20250514")
    
    def _format_integrations_for_prompt(self) -> str:
        """Format the available integrations for the system prompt"""
        lines = []
        for int_id, info in N8N_INTEGRATIONS.items():
            available = "✅ Available" if info.get('credential_id') else "⚠️ Not configured"
            lines.append(f"- **{info['display_name']}** ({int_id}): {info['description']}")
            lines.append(f"  Status: {available}")
            lines.append(f"  Capabilities: {', '.join(info['capabilities'])}")
            lines.append(f"  Keywords: {', '.join(info['keywords'][:5])}")
            lines.append("")
        return "\n".join(lines)
    
    async def design_workflow(
        self,
        user_request: str,
        voice_transcription: str = None,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Analyze a user request and design a complete workflow.
        
        Args:
            user_request: The user's description of what they want to automate
            voice_transcription: Optional voice note transcription
            context: Additional context (unit, existing tools, etc.)
        
        Returns:
            Complete workflow specification with form fields, steps, and integrations
        """
        
        # Combine text and voice input
        full_request = user_request
        if voice_transcription:
            full_request += f"\n\n[Voice note transcription]: {voice_transcription}"
        
        # Add context if provided
        if context:
            if context.get('unit'):
                full_request += f"\n\n[Context]: This is for the {context['unit']} team."
        
        try:
            # Call Claude to design the workflow
            response = await self.chat.send_message(UserMessage(full_request))
            
            # Extract JSON from response
            workflow_spec = self._extract_json(response)
            
            if workflow_spec:
                # Enrich with credential details
                workflow_spec = self._enrich_with_credentials(workflow_spec)
                return {
                    "success": True,
                    "workflow": workflow_spec,
                    "raw_response": response
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to parse workflow design from AI response",
                    "raw_response": response
                }
        
        except Exception as e:
            logger.error(f"Error designing workflow: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _extract_json(self, response: str) -> Optional[Dict]:
        """Extract JSON from Claude's response"""
        
        # Try to find JSON block
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON block: {e}")
        
        # Try to find raw JSON object
        try:
            # Find first { and last }
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end > start:
                return json.loads(response[start:end])
        except json.JSONDecodeError:
            pass
        
        return None
    
    def _enrich_with_credentials(self, workflow_spec: Dict) -> Dict:
        """Add credential details to the workflow specification"""
        
        if 'workflow_design' not in workflow_spec:
            return workflow_spec
        
        design = workflow_spec['workflow_design']
        
        # Add credential info to steps
        for step in design.get('steps', []):
            integration_id = step.get('integration')
            if integration_id and integration_id in N8N_INTEGRATIONS:
                int_info = N8N_INTEGRATIONS[integration_id]
                step['n8n_node_type'] = int_info['node_type']
                if int_info.get('credential_id'):
                    step['credential'] = {
                        'type': int_info['credential_type'],
                        'id': int_info['credential_id'],
                        'name': int_info['credential_name']
                    }
        
        # Add full integration details
        for integration in design.get('integrations_needed', []):
            int_id = integration.get('id')
            if int_id and int_id in N8N_INTEGRATIONS:
                int_info = N8N_INTEGRATIONS[int_id]
                integration['configured'] = bool(int_info.get('credential_id'))
                integration['credential_type'] = int_info.get('credential_type')
        
        return workflow_spec


async def analyze_and_design_workflow(
    user_input: str,
    voice_transcription: str = None,
    unit: str = "general"
) -> Dict[str, Any]:
    """
    Main entry point: Analyze user input and design a complete workflow.
    """
    designer = IntelligentWorkflowDesigner(unit=unit)
    return await designer.design_workflow(
        user_request=user_input,
        voice_transcription=voice_transcription,
        context={"unit": unit}
    )


def get_available_integrations() -> List[Dict]:
    """Get list of available integrations for the frontend"""
    return [
        {
            "id": int_id,
            "name": info["display_name"],
            "description": info["description"],
            "configured": bool(info.get("credential_id")),
            "capabilities": info["capabilities"]
        }
        for int_id, info in N8N_INTEGRATIONS.items()
    ]
