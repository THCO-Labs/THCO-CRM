"""
FlowForge Prompt Engineering Layer
Two-Step AI Build Process: Prompt Architect → Workflow Builder
"""

import os
import json
import logging
from typing import Optional, Dict, Any, List
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# ═══════════════════════════════════════════════════════════════════
# THCO COMPANY CONTEXT
# ═══════════════════════════════════════════════════════════════════

THCO_COMPANY_CONTEXT = """
Company: Talentco Holding Company (THCO)
Legal: Delaware LLC, headquartered in Miami, FL
Subsidiaries: Canada and Nigeria
Team size: ~26 people, scaling
Mission: "Human insight. Amplified." — Building the AI-native professional services firm of the future
Tagline: Human insight. Amplified.
Logo: Spiral representing "intelligence in motion"

Business model: AI-native professional services company competing with McKinsey, Accenture, and Big 4 firms. Proprietary AI handles 70% of analytical work while human experts focus on judgment and client relationships.

Four-layer delivery model:
1. Senior management consultants (strategic oversight)
2. Expert network (specialized domain knowledge)
3. Proprietary AI technology (automation and analysis)
4. Nigeria-based operations teams (execution at scale)

Geographic arbitrage: Nigeria-based teams deliver at lower costs while serving international market rates across US, Canada, Caribbean, EMEA, APAC.

Core operating principles:
- Relationships open doors, delivery quality closes deals
- Conversion metrics over vanity metrics
- "If the design doesn't match Accenture, don't post it"
- Always use "our client" language, never name clients directly
- Machines handle volume, humans handle judgment
- Productized services for consistent delivery at scale

Productized service offerings:
1. Discover — Finding operational waste
2. Guide — Ongoing advisory
3. Elevate — Workforce AI training
4. Automate — Technology implementation (70-85% automation target)

Technology stack:
- Automation engine for workflow orchestration
- Supabase (PostgreSQL) for data
- AI APIs for text generation, analysis, and decision support
- Voice processing for transcription
- Various SaaS integrations (email, calendar, messaging, etc.)

Quality standards:
- Match Accenture's design quality for all external outputs
- Match McKinsey's thought leadership standards for content
- Professional, enterprise-grade in everything we produce
- Every automation must have error handling and notification mechanisms
"""

# ═══════════════════════════════════════════════════════════════════
# UNIT-SPECIFIC CONTEXT
# ═══════════════════════════════════════════════════════════════════

UNIT_CONTEXTS = {
    "talent": """
### TALENT & HUMAN CAPITAL

What this unit does:
Full-cycle recruiting and talent operations. Manages sourcing, screening, interviewing, and placing candidates across 42+ active roles. Three recruiters (Chris handles 16 roles, Kenny handles 5, Yossy handles 21) supported by AI-powered sourcing tools and human judgment.

Key processes:
- Candidate sourcing (LinkedIn, job boards, referrals, AI-powered search)
- Resume screening and scoring
- Interview scheduling and coordination
- Candidate communication and follow-up
- Client account management
- Pipeline reporting and analytics
- Onboarding new placements
- Knowledge Bank creation after each role completion

Operating principles:
- N-1 Principle: Target candidates one level below in title but with equivalent experience depth
- Three-Job Framework: Thinking & Research, Orchestration, Conversations
- AI handles volume sourcing, recruiters focus on relationship management
- Five essential intake questions for every new role

Key database tables (reference for automation design):
- candidates (profiles, status, contact info, scores)
- roles (active positions, requirements, assigned recruiter)
- clients (company accounts, contacts, engagement history)
- placements (successful hires, start dates, fees)
- recruiter_assignments (who owns which role)
- candidate_interactions (emails, calls, interview notes)
- pipeline_stages (sourced → screened → interviewed → offered → placed)

Common automation patterns for this unit:
- Candidate status change triggers (new application, status update)
- Scheduled pipeline reports (daily/weekly digests)
- Follow-up reminders (candidates awaiting response)
- Interview scheduling automation
- Client update notifications
- Duplicate candidate detection
- Sourcing report generation
""",
    
    "thco-hr": """
### THCO HR

What this unit does:
Internal HR and people operations for THCO team members. Manages employee records, leave requests, expense reports, performance tracking, and internal policies across Delaware, Nigeria, and Canada jurisdictions.

Key processes:
- Leave request management
- Expense report processing
- Employee onboarding/offboarding
- Performance review coordination
- Policy documentation and distribution
- Compliance tracking across jurisdictions
- Team member record management

Operating principles:
- Multi-jurisdictional compliance (Delaware, Nigeria, Canada)
- Always calculate true costs (salary + taxes + pensions + overhead)
- Phased implementation for salary and policy changes

Key database tables:
- team_members (info, role, salary, location, start date)
- leave_requests (type, dates, status, approver)
- expenses (category, amount, status, approver)
- performance_reviews (period, ratings, feedback)
- policies (type, version, jurisdiction, effective_date)

Common automation patterns:
- Leave request approval workflows
- Expense approval routing
- Onboarding checklist automation
- Policy acknowledgment tracking
- Anniversary and milestone notifications
""",

    "sales": """
### SALES & BUSINESS DEVELOPMENT

What this unit does:
Pipeline management, client outreach, proposal creation, and revenue generation. Manages relationships with prospects and converts them into paying clients. Current pipeline includes eTranzact, Sterling Bank, First Bank UK, Cene+.

Key processes:
- Lead identification and qualification
- Outreach sequences (email, LinkedIn, referral)
- Proposal creation and scoping
- Pipeline tracking and forecasting
- Client relationship management
- Revenue reporting
- Competitive analysis

Operating principles:
- Relationship-first approach
- Five essential scoping questions for every opportunity
- Outcome-based partnership positioning
- Always position THCO's AI advantage as differentiator

Key database tables:
- leads (prospect companies, contacts, stage, source)
- opportunities (qualified deals, value, probability, timeline)
- proposals (documents, versions, status, client feedback)
- pipeline_stages (identified → qualified → proposal → negotiation → won/lost)
- client_engagements (active projects, revenue, deliverables)
- outreach_sequences (email templates, follow-up schedules)

Common automation patterns:
- Lead follow-up sequences
- Pipeline stage change notifications
- Proposal deadline reminders
- Weekly pipeline summary reports
- Client engagement status updates
- Revenue milestone alerts
""",

    "marketing": """
### MARKETING & BRAND

What this unit does:
Content production, social media management, brand management, and lead generation across 12 LinkedIn pages and multiple channels. Monthly targets: 20 blog articles, 130+ social media posts, 4 newsletters.

Key processes:
- Content calendar management
- Blog article creation and publishing
- Social media scheduling and posting
- Newsletter production and distribution
- Brand consistency enforcement
- Analytics and performance tracking
- Design asset creation

Operating principles:
- Conversion-first philosophy (qualified leads > vanity metrics)
- "If the design doesn't match Accenture, don't post it"
- Tiered brand portfolio management
- Consistent voice across all 12 LinkedIn pages

Brand tiers:
- Tier 1: THCO Main, Africa Resource Co
- Tier 2: Americas, EMEA, APAC regional pages
- Tier 3: Financial, Energy, Healthcare, Technology, Outsource, Checktal, We Are Hiring

Key database tables:
- content_calendar (planned posts, status, channel, publish date)
- blog_articles (title, content, author, status, publish date)
- social_posts (content, channel, scheduled_date, performance metrics)
- newsletters (edition, content, send date, recipient list)
- brand_assets (logos, templates, guidelines)
- analytics (impressions, clicks, leads generated, by channel)

Common automation patterns:
- Content calendar reminders and deadline alerts
- Cross-posting across LinkedIn pages
- Newsletter content aggregation
- Performance report generation
- Blog draft review notifications
- Social media engagement alerts
""",

    "advisory": """
### ADVISORY & CONSULTING

What this unit does:
Strategy consulting, client advisory engagements, and project delivery. Serves clients like Sagicor Financial ($200K, 6 Caribbean countries, 587 IT professionals) and IHS Towers. Delivers through the four-layer model with senior consultants leading and AI handling analysis.

Key processes:
- Client engagement scoping and planning
- Research and analysis
- Deliverable creation (reports, presentations, assessments)
- Client communication and status updates
- Project milestone tracking
- Expert network coordination
- Quality assurance and review

Operating principles:
- Four productized offerings: Discover, Guide, Elevate, Automate
- Four-layer delivery model
- Always "our client" — never name clients directly
- Senior consultants focus on judgment, AI handles analytical heavy lifting

Key database tables:
- engagements (client projects, scope, timeline, budget, status)
- deliverables (documents, presentations, status, deadlines)
- milestones (project phases, completion status)
- client_contacts (key stakeholders, communication preferences)
- expert_assignments (which experts are on which engagements)
- research_notes (findings, sources, analysis)

Common automation patterns:
- Milestone deadline reminders
- Client status update drafts
- Deliverable review notifications
- Weekly engagement summary reports
- Expert availability checking
- Research data aggregation
""",

    "technology": """
### TECHNOLOGY & BUILD

What this unit does:
Software development, AI agent building, infrastructure management, and internal tool development. Building a 37-agent AI ecosystem designed to automate 70-85% of routine operations across 12 functions and 4 priority tiers.

Key processes:
- Software development and deployment
- AI agent design and implementation
- Infrastructure management
- Internal tool creation and maintenance
- Code review and quality assurance
- Technical documentation
- Integration management

Operating principles:
- Canonical shared objects, status enums, and audit trails as foundations
- 70-85% automation target for routine operations
- Build modular, reusable components
- Document everything for institutional knowledge

Key database tables:
- agents (AI agent configs, status, function, priority tier)
- workflows (automation definitions, status, execution history)
- integrations (service connections, credentials, status)
- deployments (code releases, environments, status)
- technical_docs (documentation, version, last updated)

Common automation patterns:
- Deployment notification and status tracking
- Error monitoring and alerting
- Agent health checking
- Code review reminders
- Integration status monitoring
- Technical debt tracking
""",

    "operations": """
### OPERATIONS & FINANCE

What this unit does:
Back-office operations, financial management, HR, compliance, and administrative functions. Manages payroll, invoicing, team coordination, and multi-jurisdictional compliance across Delaware, Nigeria, and Canada.

Key processes:
- Invoice generation and tracking
- Payroll processing and salary management
- Expense tracking and approval
- Team onboarding and offboarding
- Compliance documentation
- Vendor management
- Office and facilities coordination

Operating principles:
- Always calculate true costs (salary + taxes + pensions + overhead)
- Geographic arbitrage awareness in financial planning
- Multi-jurisdictional compliance (Delaware, Nigeria, Canada)
- Phased implementation for salary and policy changes

Key database tables:
- invoices (client, amount, status, due date)
- expenses (category, amount, status, approver)
- team_members (info, role, salary, location, start date)
- payroll (period, amounts, deductions, status)
- vendors (company, contact, contract, payment terms)
- compliance_docs (type, jurisdiction, status, renewal date)

Common automation patterns:
- Invoice generation and reminders
- Expense approval workflows
- Payroll preparation notifications
- Compliance deadline alerts
- Vendor payment reminders
- Team anniversary and milestone notifications
""",

    "academy": """
### ACADEMY & LEARNING (Day Learning)

What this unit does:
AI upskilling platform. Currently focused on Track 1: AI Engineers (training existing developers). Pipeline: Apply → AI screen → Onboard → Video training → Build → Review. Future tracks: AI marketers, designers, ad builders.

Key processes:
- Application processing and screening
- Student onboarding
- Training content delivery
- Project assignments and evaluation
- Progress tracking
- Completion certification
- Pipeline management (applicant → student → graduate → hired)

Key database tables:
- applicants (info, application, screening score, status)
- students (enrolled, track, progress, assignments)
- courses (content, modules, assessments)
- assignments (project briefs, submissions, reviews)
- evaluations (scores, feedback, pass/fail)

Common automation patterns:
- Application screening and scoring
- Onboarding sequence automation
- Assignment deadline reminders
- Progress report generation
- Graduation notifications
- Pipeline stage transitions
""",

    "project-management": """
### PROJECT MANAGEMENT

What this unit does:
Cross-functional project coordination, tracking, and delivery management. Oversees timelines, resources, and deliverables across all client engagements and internal initiatives.

Key processes:
- Project planning and scoping
- Timeline management
- Resource allocation
- Status reporting
- Risk identification and mitigation
- Stakeholder communication
- Delivery tracking

Key database tables:
- projects (name, client, status, timeline, budget)
- tasks (project_id, assignee, status, deadline)
- milestones (project_id, date, deliverables)
- time_logs (task_id, user_id, hours, date)
- project_reports (type, period, metrics)

Common automation patterns:
- Daily project dashboard updates
- Task deadline reminders
- Milestone completion notifications
- Weekly status report generation
- Resource utilization alerts
- Risk escalation workflows
""",

    "it-tools": """
### IT & THCO TOOLS

What this unit does:
Internal IT infrastructure, tool administration, security, and the AI agent registry. Manages all 37 agents across departments, monitors system health, and ensures security compliance.

Key processes:
- System administration
- Tool provisioning and access management
- Security monitoring
- Agent health monitoring
- Integration maintenance
- Technical support
- Documentation management

Key database tables:
- agents (all 37 AI agents, status, function, priority)
- integrations (service connections, credentials, health)
- system_logs (events, errors, performance)
- access_requests (user, resource, status)
- security_incidents (type, severity, resolution)

Common automation patterns:
- Agent health checking and alerting
- Integration status monitoring
- Security compliance scanning
- Access request workflows
- System performance reports
- Email deliverability monitoring
""",

    "client-delivery": """
### CLIENT DELIVERY

What this unit does:
Managed services delivery, SLA tracking, and ongoing client engagement management. Ensures deliverables are on time, quality standards are met, and clients are informed throughout.

Key processes:
- SLA monitoring and compliance
- Deliverable tracking and quality assurance
- Client communication and reporting
- Issue escalation and resolution
- Resource allocation and capacity planning
- Performance measurement and feedback

Key database tables:
- sla_agreements (client, metrics, thresholds, penalties)
- deliverables (description, deadline, status, quality score)
- client_reports (type, frequency, recipients, last sent)
- escalations (issue, severity, status, resolution)
- resource_allocations (team member, project, hours, period)

Common automation patterns:
- SLA breach early warning alerts
- Deliverable deadline reminders
- Automated client status reports
- Escalation routing and notification
- Resource utilization reports
- Client satisfaction survey triggers
"""
}

# ═══════════════════════════════════════════════════════════════════
# PROMPT ARCHITECT SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════

PROMPT_ARCHITECT_SYSTEM = """You are the THCO FlowForge Prompt Architect. Your job is to take a team member's 
description of a problem or automation need — which may be vague, incomplete, or 
conversational — and transform it into a comprehensive, detailed Build Specification 
that will guide the creation of a production-ready automation workflow.

You are NOT building the workflow yourself. You are creating the INSTRUCTIONS that 
another AI system will follow to build the workflow. Think of yourself as a senior 
solutions architect writing a detailed technical specification for an engineering team.

Your Build Specification must be so thorough and detailed that the workflow builder 
could create a perfect automation without ever talking to the user.

═══════════════════════════════════════════════════════════════════
THCO COMPANY CONTEXT
═══════════════════════════════════════════════════════════════════
{company_context}

═══════════════════════════════════════════════════════════════════
UNIT-SPECIFIC CONTEXT
═══════════════════════════════════════════════════════════════════
{unit_context}

═══════════════════════════════════════════════════════════════════
YOUR TASK: CREATE THE BUILD SPECIFICATION
═══════════════════════════════════════════════════════════════════

Given the user's description and all the context above, create a comprehensive 
Build Specification with the following sections. Be EXHAUSTIVE.

## BUILD SPECIFICATION FORMAT

### SECTION 1: PROBLEM STATEMENT
Restate the user's problem in clear, professional language. Expand on what 
they said with your understanding of the unit's processes. Fill in obvious 
gaps they didn't mention. State the business value of solving this problem.

### SECTION 2: AUTOMATION OBJECTIVE
One clear sentence: "This automation will [do X] when [trigger Y] so that 
[outcome Z]."

### SECTION 3: SCOPE & BOUNDARIES
What this automation WILL do (explicit list).
What this automation will NOT do (explicit boundaries).
What is out of scope for this version but could be added later.

### SECTION 4: TRIGGER DEFINITION
Exactly what starts this automation:
- Type: Scheduled (cron) / Event-based (database change, webhook) / Manual
- If scheduled: exact time, timezone, frequency
- If event-based: exact event, which table/system, what condition
- If manual: who triggers it and from where

### SECTION 5: INPUT DATA
What data does this automation need to work with?
- Source system(s) and exact table(s)/endpoint(s)
- Specific columns/fields needed
- Filter criteria (what records to include/exclude)
- Expected data volume

### SECTION 6: PROCESSING LOGIC
Step-by-step logic of what happens, written as detailed pseudocode:
- Every decision point with exact conditions
- Every transformation
- Every validation check
- Edge cases: what happens when data is missing or unexpected

### SECTION 7: OUTPUT & ACTIONS
For each action the automation takes:
- What system is the action performed on
- Exact action (send email, update record, post message)
- What data is included
- Template/format for messages
- Who receives it

### SECTION 8: ERROR HANDLING
For each step that could fail:
- What could go wrong
- What should happen when it fails
- Who should be notified
- Fallback behavior

### SECTION 9: INTEGRATION REQUIREMENTS
List every external service needed:
- Service name (use friendly display names)
- What it's used for
- Required permissions

### SECTION 10: SUCCESS CRITERIA
How do we know this automation is working correctly?
- Expected output
- Key metrics to track

### SECTION 11: SUGGESTED TOOL NAME
Suggest 2-3 clear, descriptive names following: "[Action] [Object] [Context]"

### SECTION 12: FUTURE ENHANCEMENTS
2-3 things that could be added in a v2.

═══════════════════════════════════════════════════════════════════
IMPORTANT RULES
═══════════════════════════════════════════════════════════════════

1. Be EXHAUSTIVE. More detail is always better.
2. Fill in gaps intelligently using unit context.
3. Think about edge cases the user didn't mention.
4. Be specific about data queries and conditions.
5. NEVER use technical infrastructure names (say "database" not "Supabase", "automation engine" not "n8n", "AI" not "Claude").
6. Always include error handling and notification steps.
"""

# ═══════════════════════════════════════════════════════════════════
# WORKFLOW BUILDER SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════════════

WORKFLOW_BUILDER_SYSTEM = """You are the THCO FlowForge Workflow Builder. You receive a detailed Build 
Specification and your job is to translate it into a structured workflow definition.

You will receive a Build Specification that contains:
- A clear problem statement
- Detailed processing logic
- Exact trigger definitions
- Input/output specifications
- Error handling requirements
- Integration requirements

Your job is to translate this specification into a workflow structure.

## AVAILABLE INTEGRATIONS
{integrations}

## WORKFLOW GENERATION RULES

1. Follow the Build Specification's logic EXACTLY — do not deviate or simplify
2. Use credential/integration names EXACTLY as they appear in the integrations list
3. Include error handling for every step that touches an external system
4. Include a manual trigger as a secondary trigger for testing
5. Use descriptive step names that match the Build Specification's language
6. Always include the notification/summary step specified in the Build Spec
7. Default timezone: WAT for Nigeria-based operations, EST for US operations

## OUTPUT FORMAT (strict JSON)

You must respond with valid JSON in this exact format:
```json
{{
  "tool_metadata": {{
    "suggested_name": "string from Build Spec Section 11",
    "description": "string from Build Spec Section 2",
    "suggested_tags": ["array derived from Build Spec"],
    "trigger_type": "scheduled|webhook|manual",
    "trigger_description": "string from Build Spec Section 4",
    "estimated_execution_time": "string",
    "systems_used": ["array - display names from Build Spec Section 9"]
  }},
  "workflow_steps": [
    {{
      "step_number": 1,
      "name": "string - friendly step name",
      "description": "string - what this step does",
      "type": "trigger|action|condition|loop",
      "integration": "string - which integration this uses or null",
      "error_handling": "string - what happens if this fails"
    }}
  ],
  "explanation": {{
    "summary": "3-4 sentence conversational summary for the user, NO technical jargon",
    "assumptions": ["anything from the Build Spec that was assumed"],
    "warnings": ["any potential issues"],
    "future_enhancements": ["from Build Spec Section 12"]
  }},
  "integration_requirements": [
    {{
      "display_name": "string",
      "purpose": "string - what it's used for",
      "required": true
    }}
  ]
}}
```

Always wrap your response in ```json ... ``` blocks.
"""


class PromptArchitect:
    """Step 1: Creates detailed Build Specifications from user input"""
    
    def __init__(self, unit: str):
        self.unit = unit
        self.unit_context = UNIT_CONTEXTS.get(unit, UNIT_CONTEXTS.get("talent", ""))
        
        if not EMERGENT_LLM_KEY:
            raise ValueError("EMERGENT_LLM_KEY not found")
        
        # Use a more concise system prompt for Step 1
        system_prompt = f"""You are a THCO FlowForge Prompt Architect. Transform user automation requests into detailed Build Specifications.

Company: THCO - AI-native professional services firm. Mission: "Human insight. Amplified."

Unit Context:
{self.unit_context[:2000]}

## CRITICAL: STRUCTURED BRIEFS
When the user's input contains these markers:
- **TOOL NAME:** 
- **THE PROBLEM:**
- **THE TRIGGER:**
- **THE STEPS:**
- **THE OUTCOME:**
- **HOW OFTEN:**

This is a STRUCTURED BRIEF from a form. The user has provided ALL the information you need.
DO NOT ask ANY clarifying questions. IMMEDIATELY create the Build Specification using the data provided.

Create a Build Specification with these sections:
1. PROBLEM STATEMENT - Clear restatement of the need (from **THE PROBLEM:**)
2. AUTOMATION OBJECTIVE - "This automation will [X] when [Y] so that [Z]"
3. TRIGGER - From **THE TRIGGER:** (Scheduled, Event-based, or Manual)
4. INPUT DATA - Tables, fields, filters needed
5. PROCESSING LOGIC - From **THE STEPS:** - step-by-step logic
6. OUTPUT & ACTIONS - From **THE OUTCOME:** - what it does (emails, updates, notifications)
7. ERROR HANDLING - What happens when steps fail
8. INTEGRATIONS NEEDED - From **SYSTEMS & TOOLS:** - Email, Database, Slack, etc.
9. SUGGESTED NAME - Use the name from **TOOL NAME:**

Be specific but concise. Use unit context to fill gaps intelligently.
NEVER ask questions if a structured brief is provided - just build the specification."""
        
        # Use a faster model for the spec creation (less critical for quality)
        self.chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"architect-{unit}",
            system_message=system_prompt
        ).with_model("anthropic", "claude-haiku-3-5-20241022")
    
    async def create_build_spec(
        self,
        user_description: str,
        voice_transcription: Optional[str] = None,
        conversation_history: Optional[List[Dict]] = None,
        available_integrations: Optional[List[Dict]] = None,
        existing_inventory: Optional[List[Dict]] = None
    ) -> str:
        """Create a comprehensive Build Specification from user input"""
        
        # Format conversation history
        history_text = ""
        if conversation_history:
            history_text = "\n".join([
                f"{m['role'].upper()}: {m['content'][:500]}"
                for m in conversation_history[-5:]  # Last 5 messages
            ])
        
        # Format integrations
        integrations_text = ""
        if available_integrations:
            integrations_text = "\n".join([
                f"- {i['display_name']} ({i['status']})"
                for i in available_integrations
            ])
        
        # Format inventory
        inventory_text = ""
        if existing_inventory:
            inventory_text = "\n".join([
                f"- {w['name']}: {w.get('description', 'No description')[:100]}"
                for w in existing_inventory[:10]
            ])
        
        # Format the combined input using guided_input service
        from services.guided_input import format_combined_input, detect_input_type
        
        # Detect input type and format accordingly
        input_type = detect_input_type(user_description, has_voice=bool(voice_transcription))
        
        if input_type in ['structured_brief', 'both']:
            combined_input = format_combined_input(user_description, voice_transcription)
        else:
            combined_input = f"""USER'S DESCRIPTION:
{user_description}

{"VOICE TRANSCRIPTION:" if voice_transcription else ""}
{voice_transcription or ""}"""
        
        prompt = f"""
{combined_input}

{"CONVERSATION HISTORY (for context):" if history_text else ""}
{history_text}

{"AVAILABLE INTEGRATIONS:" if integrations_text else ""}
{integrations_text}

{"EXISTING AUTOMATION INVENTORY (avoid duplicates):" if inventory_text else ""}
{inventory_text}

Please create the comprehensive Build Specification based on the user's input.
"""
        
        message = UserMessage(text=prompt)
        response = await self.chat.send_message(message)
        
        return response


class WorkflowBuilder:
    """Step 2: Generates workflow structure from Build Specification"""
    
    def __init__(self):
        if not EMERGENT_LLM_KEY:
            raise ValueError("EMERGENT_LLM_KEY not found")
    
    async def build_workflow(
        self,
        build_spec: str,
        available_integrations: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Generate workflow from Build Specification"""
        
        # Format integrations concisely
        integrations_text = "Available: Database, Email, Calendar, Slack, AI"
        if available_integrations:
            connected = [i['display_name'] for i in available_integrations if i.get('status') == 'connected']
            integrations_text = f"Connected: {', '.join(connected[:8])}"
        
        system_prompt = f"""You are FlowForge Workflow Builder. Given a Build Specification, create a workflow structure.

Available Integrations: {integrations_text}

Output ONLY valid JSON in this format:
{{
  "tool_metadata": {{
    "suggested_name": "Name from Build Spec",
    "description": "Brief description",
    "trigger_type": "scheduled|webhook|manual",
    "trigger_description": "When this runs",
    "systems_used": ["Email", "Database", "Slack"]
  }},
  "workflow_steps": [
    {{"step_number": 1, "name": "Step name", "description": "What it does", "type": "trigger|action|condition"}}
  ],
  "explanation": {{
    "summary": "3-4 sentence plain English summary for the user",
    "warnings": ["Any potential issues"],
    "future_enhancements": ["v2 improvements"]
  }},
  "integration_requirements": [
    {{"display_name": "Email", "purpose": "Send follow-ups"}}
  ]
}}"""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"builder-{hash(build_spec[:100])}",
            system_message=system_prompt
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        prompt = f"""
BUILD SPECIFICATION:
{build_spec}

Please generate the complete workflow structure based on this Build Specification.
Respond with valid JSON only.
"""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Parse JSON from response
        workflow_data = self._extract_json(response)
        
        return workflow_data
    
    def _extract_json(self, response: str) -> Dict[str, Any]:
        """Extract JSON from response"""
        import re
        
        # Try to find JSON block
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find raw JSON
        try:
            # Find first { and last }
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(response[start:end])
        except json.JSONDecodeError:
            pass
        
        # Return a fallback structure
        return {
            "tool_metadata": {
                "suggested_name": "Untitled Automation",
                "description": "Automation generated from Build Specification",
                "suggested_tags": [],
                "trigger_type": "manual",
                "trigger_description": "Manually triggered",
                "systems_used": []
            },
            "workflow_steps": [],
            "explanation": {
                "summary": response[:500],
                "assumptions": [],
                "warnings": ["Failed to parse structured workflow - review Build Specification"],
                "future_enhancements": []
            },
            "integration_requirements": [],
            "parse_error": True
        }


async def generate_workflow_two_step(
    conversation_id: str,
    unit: str,
    user_description: str,
    voice_transcription: Optional[str] = None,
    conversation_history: Optional[List[Dict]] = None,
    timeout_seconds: int = 120  # Increased from 60 to 120 seconds per step
) -> Dict[str, Any]:
    """
    Main entry point for the two-step workflow generation process
    
    Step 1: Prompt Architect creates Build Specification
    Step 2: Workflow Builder generates workflow from spec
    
    Returns complete result with build_spec stored for admin review
    """
    import asyncio
    
    # Get integrations
    available_integrations = await _get_integrations()
    existing_inventory = await _get_inventory()
    
    # ═══════════════════════════════════════════════════
    # STEP 1: PROMPT ARCHITECT — Create the Build Spec
    # ═══════════════════════════════════════════════════
    logger.info(f"[FlowForge] Step 1: Creating Build Specification for {unit}")
    
    try:
        architect = PromptArchitect(unit)
        build_spec = await asyncio.wait_for(
            architect.create_build_spec(
                user_description=user_description,
                voice_transcription=voice_transcription,
                conversation_history=conversation_history,
                available_integrations=available_integrations,
                existing_inventory=existing_inventory
            ),
            timeout=timeout_seconds
        )
    except asyncio.TimeoutError:
        logger.warning(f"[FlowForge] Step 1 timed out after {timeout_seconds}s")
        raise TimeoutError("Build specification generation timed out")
    
    logger.info(f"[FlowForge] Build Spec created: {len(build_spec)} chars")
    
    # ═══════════════════════════════════════════════════
    # STEP 2: WORKFLOW BUILDER — Generate the workflow
    # ═══════════════════════════════════════════════════
    logger.info("[FlowForge] Step 2: Building workflow from spec")
    
    try:
        builder = WorkflowBuilder()
        workflow_result = await asyncio.wait_for(
            builder.build_workflow(
                build_spec=build_spec,
                available_integrations=available_integrations
            ),
            timeout=timeout_seconds
        )
    except asyncio.TimeoutError:
        logger.warning(f"[FlowForge] Step 2 timed out after {timeout_seconds}s")
        # Return partial result with build spec
        return {
            "build_spec": build_spec,
            "workflow_data": {"suggested_name": "Pending Workflow"},
            "workflow_steps": [],
            "explanation": {"summary": "Build specification created but workflow generation timed out. Please try again."},
            "integration_requirements": [],
            "has_workflow": False,
            "content": f"I've analyzed your request and created a detailed specification. However, the workflow generation is taking longer than expected.\n\n**Build Specification Preview:**\n{build_spec[:500]}...\n\nWould you like me to try again?",
            "has_action_buttons": True,
            "action_buttons": [
                {"label": "Try Again", "action": "retry_generation", "primary": True},
                {"label": "Start Over", "action": "reset", "primary": False}
            ]
        }
    
    logger.info("[FlowForge] Workflow built successfully")
    
    # Combine results
    return {
        "build_spec": build_spec,  # Stored for admin review
        "workflow_data": workflow_result.get("tool_metadata", {}),
        "workflow_steps": workflow_result.get("workflow_steps", []),
        "explanation": workflow_result.get("explanation", {}),
        "integration_requirements": workflow_result.get("integration_requirements", []),
        "has_workflow": True,
        "content": _format_user_response(workflow_result),
        "has_action_buttons": True,
        "action_buttons": [
            {"label": "Submit for Approval", "action": "submit_approval", "primary": True},
            {"label": "Make Changes", "action": "request_changes", "primary": False}
        ]
    }


def _format_user_response(workflow_result: Dict[str, Any]) -> str:
    """Format the workflow result as a user-friendly response"""
    
    explanation = workflow_result.get("explanation", {})
    metadata = workflow_result.get("tool_metadata", {})
    steps = workflow_result.get("workflow_steps", [])
    
    summary = explanation.get("summary", "I've designed an automation based on your description.")
    
    response_parts = [summary, ""]
    
    # Add tool name suggestion
    if metadata.get("suggested_name"):
        response_parts.append(f"**Suggested Name:** {metadata['suggested_name']}")
        response_parts.append("")
    
    # Add steps preview
    if steps:
        response_parts.append("**What it does:**")
        for step in steps[:6]:  # Show first 6 steps
            response_parts.append(f"• {step.get('name', 'Step')}: {step.get('description', '')[:80]}")
        if len(steps) > 6:
            response_parts.append(f"  ...and {len(steps) - 6} more steps")
        response_parts.append("")
    
    # Add trigger info
    if metadata.get("trigger_description"):
        response_parts.append(f"**Trigger:** {metadata['trigger_description']}")
        response_parts.append("")
    
    # Add warnings
    warnings = explanation.get("warnings", [])
    if warnings:
        response_parts.append("**Note:**")
        for warning in warnings[:2]:
            response_parts.append(f"⚠️ {warning}")
        response_parts.append("")
    
    response_parts.append("Ready to submit for approval, or would you like to make changes?")
    
    return "\n".join(response_parts)


async def _get_integrations() -> List[Dict]:
    """Get available integrations from database"""
    import os
    from supabase import create_client
    
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return []
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        result = supabase.table('flowforge_integrations').select('*').execute()
        return result.data or []
    except Exception as e:
        logger.warning(f"Failed to get integrations: {e}")
        return []


async def _get_inventory() -> List[Dict]:
    """Get existing workflow inventory"""
    import os
    from supabase import create_client
    
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return []
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        result = supabase.table('flowforge_workflow_inventory').select('name,description').limit(20).execute()
        return result.data or []
    except Exception as e:
        logger.warning(f"Failed to get inventory: {e}")
        return []
