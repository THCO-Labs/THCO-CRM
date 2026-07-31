"""
FlowForge Guided Input Structure
Structured Problem Brief Template + Voice Note Integration
"""

from typing import Dict, Optional

# Unit-specific example text for the problem brief template
UNIT_EXAMPLES = {
    "talent": {
        "tool_name": "Auto Candidate Follow-Up, Weekly Pipeline Report, Interview Scheduler Bot",
        "problem": "I manually check for unresponsive candidates every morning, Scheduling interviews takes too long, I forget to update candidate statuses after calls",
        "trigger": "Every Monday at 9 AM, Whenever a new candidate applies, When a candidate hasn't responded in 3 days",
        "steps": "Check database for cold candidates, filter by status, send personalized email, update their record, post summary to Slack",
        "outcome": "All cold candidates get a follow-up email, their status is updated, and I get a Slack summary of what was sent",
        "who": "I trigger it, candidates receive the emails, the Slack summary goes to the #talent channel",
        "systems": "Our database, Gmail, Slack, LinkedIn, Google Sheets",
        "exceptions": "Skip candidates who already have an interview scheduled, Don't send emails on weekends"
    },
    "sales": {
        "tool_name": "Lead Follow-Up Bot, Weekly Pipeline Digest, Proposal Deadline Reminder",
        "problem": "I forget to follow up with leads after proposals, Pipeline reporting takes half a day every Monday, I manually track which prospects haven't responded",
        "trigger": "Every Monday at 8 AM, When a proposal is sent, 3 days after initial outreach",
        "steps": "Check CRM for stale leads, filter by last contact date, draft follow-up email, send via Gmail, update CRM status",
        "outcome": "No leads fall through the cracks, pipeline is always up to date, I know exactly who needs attention",
        "who": "Sales team uses it, prospects receive emails, weekly report goes to leadership",
        "systems": "Our database, Gmail, Slack, LinkedIn",
        "exceptions": "Skip leads that have responded, Don't send during holidays"
    },
    "marketing": {
        "tool_name": "Content Cross-Poster, Newsletter Aggregator, Performance Report Generator",
        "problem": "I manually cross-post to all 12 LinkedIn pages, The newsletter content takes 3 hours to aggregate, I can't track which blog posts are performing well",
        "trigger": "When a new blog post is published, Every Friday at 4 PM, First Monday of the month",
        "steps": "Get latest blog content, format for each platform, schedule posts across all LinkedIn pages, track engagement",
        "outcome": "Content is automatically distributed to all channels, I save 3 hours per week, engagement is tracked automatically",
        "who": "Marketing team creates content, all LinkedIn pages get updated, analytics go to leadership",
        "systems": "WordPress, LinkedIn, Slack, Google Analytics, Mailchimp",
        "exceptions": "Don't post on weekends, Skip pages that already have scheduled content"
    },
    "advisory": {
        "tool_name": "Client Status Report Generator, Deliverable Deadline Tracker, Meeting Prep Bot",
        "problem": "Client status reports take 2 hours to write, I manually track deliverable deadlines, Meeting prep briefings are always rushed",
        "trigger": "Every Friday at 3 PM, 2 days before a deliverable is due, 1 hour before client meetings",
        "steps": "Pull recent activity from project tracker, summarize key updates, format as client report, send to account manager for review",
        "outcome": "Status reports are auto-generated weekly, no deliverable deadline is missed, meeting prep is ready in advance",
        "who": "Consultants use it, clients receive status updates, project managers get deadline alerts",
        "systems": "Our database, Gmail, Slack, Google Docs, Calendar",
        "exceptions": "Skip clients with no recent activity, Don't send reports during active engagements"
    },
    "operations": {
        "tool_name": "Invoice Reminder Bot, Expense Approval Tracker, Payroll Prep Assistant",
        "problem": "Invoices are sent late because I forget due dates, Expense approvals sit in email for days, Payroll prep requires pulling data from three different places",
        "trigger": "7 days before invoice due date, When an expense is submitted, First of every month",
        "steps": "Check for upcoming due dates, send reminder to responsible person, track acknowledgment, escalate if no response",
        "outcome": "No invoice is late, expenses are approved within 24 hours, payroll data is ready on time",
        "who": "Finance team uses it, team members get reminders, leadership gets escalations",
        "systems": "Our database, Gmail, Slack, Google Sheets, QuickBooks",
        "exceptions": "Skip invoices already paid, Don't send reminders on weekends"
    },
    "technology": {
        "tool_name": "Deployment Notifier, Error Monitor Bot, Integration Health Checker",
        "problem": "Deployment notifications are manual, Error monitoring requires checking multiple dashboards, Integration health checks aren't automated",
        "trigger": "When code is deployed, Every 15 minutes, When an integration fails",
        "steps": "Monitor deployment pipeline, capture status and logs, format notification, send to relevant channel",
        "outcome": "Team knows instantly when deployments happen, errors are caught early, integration issues trigger immediate alerts",
        "who": "Dev team gets notifications, on-call engineer gets alerts, leadership gets daily summaries",
        "systems": "GitHub, Slack, PagerDuty, our database, monitoring tools",
        "exceptions": "Don't alert for non-production deployments, Batch low-priority errors"
    },
    "academy": {
        "tool_name": "Application Screener, Progress Tracker, Assignment Reminder Bot",
        "problem": "Application screening is fully manual, I can't track student progress across modules, Assignment review reminders don't exist",
        "trigger": "When a new application is submitted, Weekly on Mondays, 2 days before assignment due",
        "steps": "Review application against criteria, score and categorize, send acknowledgment, add to review queue",
        "outcome": "Applications are screened within 24 hours, student progress is visible at a glance, no assignment deadline is missed",
        "who": "Admissions team uses it, applicants get updates, instructors get deadline reminders",
        "systems": "Our database, Gmail, Slack, Google Sheets, LMS",
        "exceptions": "Skip incomplete applications, Don't send reminders for completed assignments"
    },
    "project-management": {
        "tool_name": "Task Deadline Tracker, Resource Utilization Bot, Weekly Status Compiler",
        "problem": "Task deadlines are missed because reminders are manual, Resource allocation is tracked in spreadsheets, Weekly status takes hours to compile",
        "trigger": "3 days before task deadline, Every Monday at 8 AM, When a milestone is completed",
        "steps": "Check all active projects, identify upcoming deadlines, compile status updates, send digest to stakeholders",
        "outcome": "No deadline is missed, resource utilization is visible, weekly status is ready in minutes",
        "who": "PMs use it, team members get reminders, leadership gets weekly rollups",
        "systems": "Our database, Slack, Google Sheets, Calendar",
        "exceptions": "Skip completed tasks, Don't include archived projects"
    },
    "thco-hr": {
        "tool_name": "Leave Request Processor, Onboarding Checklist Bot, Policy Update Notifier",
        "problem": "Leave requests sit unprocessed for days, Onboarding checklists are tracked manually, Policy updates aren't communicated consistently",
        "trigger": "When a leave request is submitted, When a new hire starts, When a policy is updated",
        "steps": "Validate request against balance, route to appropriate approver, send confirmation, update calendar",
        "outcome": "Leave requests are processed within 4 hours, every new hire has a complete onboarding, policy updates reach everyone",
        "who": "HR team manages it, employees submit requests, managers approve",
        "systems": "Our database, Gmail, Slack, Google Calendar, HRIS",
        "exceptions": "Flag requests that exceed balance, Skip contractors for certain policies"
    },
    "client-delivery": {
        "tool_name": "SLA Monitor, Client Report Generator, Escalation Router",
        "problem": "SLA breaches aren't caught early enough, Client status reports are manual, Escalation routing is ad-hoc",
        "trigger": "When SLA threshold is 80% reached, Every Friday, When a critical issue is logged",
        "steps": "Monitor all active SLAs, identify at-risk items, alert relevant team, generate report if needed",
        "outcome": "SLA breaches are prevented, clients get timely updates, escalations reach the right person immediately",
        "who": "Delivery team monitors, clients receive reports, leadership gets escalations",
        "systems": "Our database, Slack, Gmail, ticketing system",
        "exceptions": "Skip inactive clients, Don't escalate low-severity issues"
    },
    "it-tools": {
        "tool_name": "Agent Health Monitor, Access Request Processor, Security Alert Bot",
        "problem": "Agent health isn't monitored proactively, Access requests require manual processing, Security alerts are scattered across tools",
        "trigger": "Every 5 minutes, When an access request is submitted, When a security event is detected",
        "steps": "Check all agent statuses, identify unhealthy agents, alert on-call, log incident",
        "outcome": "Agent issues are caught before users notice, access is granted within 1 hour, security events trigger immediate response",
        "who": "IT team monitors, employees request access, security team gets alerts",
        "systems": "Our agent registry, Slack, ticketing system, security tools",
        "exceptions": "Skip agents in maintenance mode, Batch non-critical alerts"
    }
}


def get_welcome_template(unit: str, unit_display_name: str) -> str:
    """
    Generate the structured problem brief template for a specific unit.
    This is the first message shown when a user starts a new FlowForge conversation.
    """
    
    # Get unit-specific examples, fallback to talent if not found
    examples = UNIT_EXAMPLES.get(unit, UNIT_EXAMPLES.get("talent", {}))
    
    template = f"""Hey! Let's build your automation for **{unit_display_name}**.

I need you to do two things so I can build this perfectly:

---

## 📝 STEP 1: TYPE OUT YOUR PROBLEM BRIEF

Copy the structure below, fill in your answers, and send it as a message.
Be as specific as you can — the more detail, the better I build.

---

**TOOL NAME:**
*What should this tool be called? e.g., "{examples.get('tool_name', 'My Automation')}"*

**THE PROBLEM:**
*What's the pain point? What's frustrating, slow, or broken right now? e.g., "{examples.get('problem', 'Manual task that takes too long')}"*

**THE TRIGGER:**
*What event or moment should kick this off? e.g., "{examples.get('trigger', 'Every day at 9 AM')}"*

**THE STEPS:**
*Walk me through what should happen, step by step. e.g., "{examples.get('steps', 'Check data, process it, send notification')}"*

**THE OUTCOME:**
*What does success look like when this runs? e.g., "{examples.get('outcome', 'Task is done automatically, I get a summary')}"*

**WHO IS INVOLVED:**
*Who uses this, who receives outputs, who needs to know? e.g., "{examples.get('who', 'I trigger it, team gets notifications')}"*

**HOW OFTEN:**
*How frequently does this need to run? e.g., "Daily at 9 AM" or "Whenever a new record is added"*

**SYSTEMS & TOOLS:**
*What apps, platforms, or data sources are involved? e.g., "{examples.get('systems', 'Database, Gmail, Slack')}"*

**EXCEPTIONS & EDGE CASES:**
*Anything that should be handled differently? e.g., "{examples.get('exceptions', 'Skip weekends, handle missing data')}"*

**ANYTHING ELSE:**
*Any other context, preferences, constraints, or wishes?*

---

## 🎤 STEP 2: RECORD A VOICE NOTE

After you type out the brief above, hit the **microphone button** and walk me through the problem in your own words. Cover the same points but add the context and nuance that's hard to type out — the "why" behind the problem, what you've tried before, what annoys you most.

The voice note gives me the full picture. Talk naturally, like you're explaining it to a colleague.

---

Once you've sent both (typed brief + voice note), I'll:
✅ Check if a similar tool already exists
✅ Confirm which integrations are needed
✅ Build your automation
✅ Show you a preview for approval

**Let's go!** 👇"""

    return template


def get_voice_prompt_message() -> str:
    """
    Message shown after user sends only a typed brief, prompting for voice note.
    """
    return """Got your brief! 📝 

Before I start building, would you also like to record a quick voice note? It helps me catch details that are hard to type out — like tone preferences, context about your team, or edge cases you might not think to write down.

*Click the microphone button to record, or click "Skip" to build with what I have.*"""


def get_typed_prompt_message() -> str:
    """
    Message shown after user sends only a voice note, prompting for typed brief.
    """
    return """Great voice note! I got a lot of context from that. 🎤

To make sure I don't miss anything, could you also fill out the typed brief? It helps me get the specific details right — especially the exact trigger timing, which systems to use, and any edge cases.

*Or if you'd prefer, I can work with your voice note and ask you a few quick follow-up questions instead.*"""


def format_combined_input(
    typed_brief: Optional[str],
    voice_transcription: Optional[str]
) -> str:
    """
    Format the combined user input (typed brief + voice note) for the Prompt Architect.
    """
    parts = []
    
    if typed_brief:
        parts.append(f"""STRUCTURED PROBLEM BRIEF (typed by user):
---
{typed_brief}
---""")
    
    if voice_transcription:
        parts.append(f"""VOICE NOTE TRANSCRIPTION (additional context):
---
{voice_transcription}
---""")
    
    return "\n\n".join(parts)


def detect_input_type(message: str, has_voice: bool = False) -> str:
    """
    Detect what type of input the user has provided.
    
    Returns:
        'structured_brief' - User followed the template structure
        'free_form' - User wrote a paragraph without structure
        'voice_only' - User only sent a voice note
        'both' - User sent both typed and voice input
    """
    if has_voice and not message:
        return 'voice_only'
    
    if has_voice and message:
        return 'both'
    
    # Check if message follows the structured format
    structure_indicators = [
        'TOOL NAME:', 'THE PROBLEM:', 'THE TRIGGER:', 'THE STEPS:',
        'THE OUTCOME:', 'WHO IS INVOLVED:', 'HOW OFTEN:', 'SYSTEMS',
        'EXCEPTIONS', 'Tool Name:', 'Problem:', 'Trigger:', 'Steps:'
    ]
    
    has_structure = sum(1 for indicator in structure_indicators if indicator.lower() in message.lower())
    
    if has_structure >= 3:
        return 'structured_brief'
    
    return 'free_form'


def get_follow_up_questions(message: str, detected_type: str) -> Optional[str]:
    """
    Generate follow-up questions for incomplete or free-form input.
    """
    if detected_type == 'structured_brief':
        return None  # No follow-up needed
    
    # Parse what's missing from the message
    message_lower = message.lower()
    
    missing = []
    
    # Check for key elements
    if not any(word in message_lower for word in ['name', 'call', 'called']):
        missing.append("**Tool name:** What should we call this?")
    
    if not any(word in message_lower for word in ['every', 'when', 'trigger', 'daily', 'weekly', 'schedule']):
        missing.append("**Trigger:** Should this run at a specific time, or be triggered by an event?")
    
    if not any(word in message_lower for word in ['database', 'gmail', 'slack', 'email', 'sheet', 'calendar']):
        missing.append("**Systems:** What apps or data sources are involved?")
    
    if not missing:
        return None
    
    questions = "\n".join([f"{i+1}. {q}" for i, q in enumerate(missing)])
    
    return f"""Thanks for the description! I have most of what I need. Just a few quick things to confirm:

{questions}

Then I'll have everything to start building."""


# Unit display names mapping
UNIT_DISPLAY_NAMES = {
    "talent": "Talent & Human Capital",
    "thco-hr": "THCO HR",
    "sales": "Sales & Business Development",
    "marketing": "Marketing & Brand",
    "advisory": "Advisory & Consulting",
    "technology": "Technology & Build",
    "operations": "Operations & Finance",
    "academy": "Academy & Learning",
    "project-management": "Project Management",
    "it-tools": "IT & THCO Tools",
    "client-delivery": "Client Delivery"
}


def get_unit_display_name(unit: str) -> str:
    """Get the display name for a unit."""
    return UNIT_DISPLAY_NAMES.get(unit, unit.replace("-", " ").title())
