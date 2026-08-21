"""13 branded HTML email templates for the Project Delivery Workflow."""

GOLD = "#C9A84C"
GREEN = "#1B4332"
FRONTEND_URL_PLACEHOLDER = "{{FRONTEND_URL}}"

import os

def _get_frontend_url():
    return os.environ.get("FRONTEND_URL", "https://executive-decks.preview.emergentagent.com")


def _base(title: str, body_html: str, cta_url: str = "", cta_text: str = "") -> str:
    frontend_url = _get_frontend_url()
    if cta_url and not cta_url.startswith("http"):
        cta_url = f"{frontend_url}{cta_url}"

    cta_block = ""
    if cta_url and cta_text:
        cta_block = f"""
        <tr><td style="padding:24px 0 0;">
          <a href="{cta_url}" style="display:inline-block;background:{GOLD};color:{GREEN};font-weight:700;
            padding:14px 32px;border-radius:6px;text-decoration:none;font-family:Inter,sans-serif;font-size:14px;">
            {cta_text}
          </a>
        </td></tr>"""

    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Inter,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
  <tr><td style="background:{GREEN};padding:24px 32px;">
    <span style="color:{GOLD};font-size:20px;font-weight:700;font-family:Inter,sans-serif;letter-spacing:2px;">THCO</span>
    <span style="color:#ffffff;font-size:12px;font-family:Inter,sans-serif;margin-left:12px;letter-spacing:1px;">TOOLS</span>
  </td></tr>
  <tr><td style="padding:32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-family:Inter,sans-serif;font-size:14px;line-height:1.7;color:#333333;">
        {body_html}
      </td></tr>
      {cta_block}
    </table>
  </td></tr>
  <tr><td style="background:#fafafa;padding:16px 32px;border-top:1px solid #eee;">
    <p style="margin:0;font-size:11px;color:#999;font-family:Inter,sans-serif;">
      Sent by Crowther Tools &mdash; tools@thcohq.com
    </p>
  </td></tr>
</table>
</td></tr></table></body></html>"""


# 1
def project_uploaded_to_hr(ctx: dict) -> tuple:
    subject = f"New project ready for delegation: {ctx['project_name']}"
    body = f"""
    <h2 style="margin:0 0 16px;color:{GREEN};font-size:20px;">New Project Uploaded</h2>
    <p><strong>{ctx['creator_name']}</strong> has uploaded a new project that needs to be delegated to an engineer.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#666;width:140px;">Project</td><td style="padding:8px 0;font-weight:600;">{ctx['project_name']}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Client</td><td style="padding:8px 0;">{ctx['client_name']}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Description</td><td style="padding:8px 0;">{ctx.get('description', 'N/A')}</td></tr>
    </table>
    <p>Please review the attached documents and delegate this project to an available engineer.</p>
    """
    html = _base(subject, body, "/thco-hr/delegation", "Open Delegation Board")
    return subject, html


# 2
def engineer_delegated(ctx: dict) -> tuple:
    subject = f"You've been assigned: {ctx['project_name']} - review within 120 min"
    body = f"""
    <h2 style="margin:0 0 16px;color:{GREEN};font-size:20px;">New Project Assignment</h2>
    <p>Hi {ctx['engineer_name']},</p>
    <p>You have been assigned to review a new project. Please open and review the documents within <strong>120 minutes</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#666;width:140px;">Project</td><td style="padding:8px 0;font-weight:600;">{ctx['project_name']}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Client</td><td style="padding:8px 0;">{ctx['client_name']}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Delegated by</td><td style="padding:8px 0;">{ctx['delegated_by']}</td></tr>
    </table>
    {f"<p><strong>Note from HR:</strong> {ctx['note']}</p>" if ctx.get('note') else ""}
    <p style="color:#cc0000;font-weight:600;">SLA Window 1: You have 120 minutes to open these documents.</p>
    """
    html = _base(subject, body, f"/technology/my-projects/{ctx['project_id']}/review", "Open Project Review")
    return subject, html


# 3
def window1_60min(ctx: dict) -> tuple:
    subject = f"Reminder: Open {ctx['project_name']} documents (60 min left)"
    body = f"""
    <h2 style="margin:0 0 16px;color:{GOLD};font-size:20px;">60 Minutes Remaining</h2>
    <p>Hi {ctx['engineer_name']},</p>
    <p>You have <strong>60 minutes remaining</strong> to open the documents for <strong>{ctx['project_name']}</strong>.</p>
    <p>Please open and begin your review now to stay within the SLA window.</p>
    """
    html = _base(subject, body, f"/technology/my-projects/{ctx['project_id']}/review", "Open Review Now")
    return subject, html


# 4
def window1_30min(ctx: dict) -> tuple:
    subject = f"Urgent: 30 min to open {ctx['project_name']}"
    body = f"""
    <h2 style="margin:0 0 16px;color:#cc0000;font-size:20px;">URGENT: 30 Minutes Remaining</h2>
    <p>Hi {ctx['engineer_name']},</p>
    <p>You have only <strong>30 minutes left</strong> to open the documents for <strong>{ctx['project_name']}</strong>.</p>
    <p>Failure to open within the SLA window will trigger an escalation.</p>
    """
    html = _base(subject, body, f"/technology/my-projects/{ctx['project_id']}/review", "Open Review Now")
    return subject, html


# 5
def window1_breach(ctx: dict) -> tuple:
    subject = f"SLA Breach: {ctx['project_name']} not opened"
    body = f"""
    <h2 style="margin:0 0 16px;color:#cc0000;font-size:20px;">SLA Breach - Window 1</h2>
    <p>Engineer <strong>{ctx['engineer_name']}</strong> has not opened the documents for <strong>{ctx['project_name']}</strong> within the 120-minute SLA window.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#666;width:140px;">Project</td><td style="padding:8px 0;font-weight:600;">{ctx['project_name']}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Engineer</td><td style="padding:8px 0;">{ctx['engineer_name']} ({ctx['engineer_email']})</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Delegated</td><td style="padding:8px 0;">{ctx['delegated_at']}</td></tr>
    </table>
    <p>This requires immediate attention.</p>
    """
    html = _base(subject, body, "/thco-hr/delegation", "View Delegation Board")
    return subject, html


# 6
def window2_started(ctx: dict) -> tuple:
    subject = f"Confirmed open - review {ctx['project_name']} within 120 min"
    body = f"""
    <h2 style="margin:0 0 16px;color:{GREEN};font-size:20px;">Review Window Started</h2>
    <p>Hi {ctx['engineer_name']},</p>
    <p>You have opened the documents for <strong>{ctx['project_name']}</strong>. You now have <strong>120 minutes</strong> to submit your review decision.</p>
    <p>Please review the PRD/Brief and Roadmap, then approve or request revisions.</p>
    """
    html = _base(subject, body, f"/technology/my-projects/{ctx['project_id']}/review", "Continue Review")
    return subject, html


# 7
def window2_60min(ctx: dict) -> tuple:
    subject = f"Reminder: Submit decision on {ctx['project_name']} (60 min left)"
    body = f"""
    <h2 style="margin:0 0 16px;color:{GOLD};font-size:20px;">60 Minutes Remaining</h2>
    <p>Hi {ctx['engineer_name']},</p>
    <p>You have <strong>60 minutes remaining</strong> to submit your review decision for <strong>{ctx['project_name']}</strong>.</p>
    """
    html = _base(subject, body, f"/technology/my-projects/{ctx['project_id']}/review", "Submit Decision")
    return subject, html


# 8
def window2_30min(ctx: dict) -> tuple:
    subject = f"Urgent: 30 min to decide on {ctx['project_name']}"
    body = f"""
    <h2 style="margin:0 0 16px;color:#cc0000;font-size:20px;">URGENT: 30 Minutes Remaining</h2>
    <p>Hi {ctx['engineer_name']},</p>
    <p>You have only <strong>30 minutes left</strong> to submit your decision on <strong>{ctx['project_name']}</strong>.</p>
    """
    html = _base(subject, body, f"/technology/my-projects/{ctx['project_id']}/review", "Submit Decision Now")
    return subject, html


# 9
def window2_breach(ctx: dict) -> tuple:
    subject = f"SLA Breach: {ctx['project_name']} review overdue"
    body = f"""
    <h2 style="margin:0 0 16px;color:#cc0000;font-size:20px;">SLA Breach - Window 2</h2>
    <p>Engineer <strong>{ctx['engineer_name']}</strong> has not submitted a review decision for <strong>{ctx['project_name']}</strong> within the 120-minute review window.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#666;width:140px;">Project</td><td style="padding:8px 0;font-weight:600;">{ctx['project_name']}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Engineer</td><td style="padding:8px 0;">{ctx['engineer_name']} ({ctx['engineer_email']})</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Opened at</td><td style="padding:8px 0;">{ctx['opened_at']}</td></tr>
    </table>
    """
    html = _base(subject, body, "/thco-hr/delegation", "View Delegation Board")
    return subject, html


# 10
def engineer_approved(ctx: dict) -> tuple:
    subject = f"Good to go: {ctx['project_name']} approved by {ctx['engineer_name']}"
    body = f"""
    <h2 style="margin:0 0 16px;color:{GREEN};font-size:20px;">Project Approved</h2>
    <p>Great news! <strong>{ctx['engineer_name']}</strong> has approved both the PRD/Brief and Roadmap for <strong>{ctx['project_name']}</strong>.</p>
    <p>The project is now ready for build.</p>
    """
    html = _base(subject, body, "/talent/projects", "View Projects")
    return subject, html


# 11
def engineer_rejected(ctx: dict) -> tuple:
    subject = f"Revision requested: {ctx['project_name']} (notes attached)"
    body = f"""
    <h2 style="margin:0 0 16px;color:{GOLD};font-size:20px;">Revision Requested</h2>
    <p><strong>{ctx['engineer_name']}</strong> has reviewed <strong>{ctx['project_name']}</strong> and is requesting revisions.</p>
    <div style="background:#fff8e1;border-left:4px solid {GOLD};padding:16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-weight:600;margin-bottom:8px;">Engineer's Notes:</p>
      <p style="margin:0;white-space:pre-wrap;">{ctx['notes']}</p>
    </div>
    <p>Please update the documents and re-upload them through the portal.</p>
    """
    html = _base(subject, body, "/talent/projects", "View Projects")
    return subject, html


# 12
def standup_reminder(ctx: dict) -> tuple:
    subject = f"Daily standup reminder: {ctx['project_name']}"
    body = f"""
    <h2 style="margin:0 0 16px;color:{GREEN};font-size:20px;">Daily Standup Due</h2>
    <p>Hi {ctx['engineer_name']},</p>
    <p>Please submit your daily standup update for <strong>{ctx['project_name']}</strong>.</p>
    <p>What did you work on yesterday? What are you working on today? Any blockers?</p>
    """
    html = _base(subject, body, f"/technology/my-projects/{ctx['project_id']}/tracker", "Submit Standup")
    return subject, html


# 13
def standup_missed_2days(ctx: dict) -> tuple:
    subject = f"Engineer {ctx['engineer_name']} missed 2 standups on {ctx['project_name']}"
    body = f"""
    <h2 style="margin:0 0 16px;color:#cc0000;font-size:20px;">Missed Standup Escalation</h2>
    <p>Engineer <strong>{ctx['engineer_name']}</strong> has not submitted a daily standup for <strong>{ctx['project_name']}</strong> in the last 2 working days.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#666;width:140px;">Project</td><td style="padding:8px 0;font-weight:600;">{ctx['project_name']}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Engineer</td><td style="padding:8px 0;">{ctx['engineer_name']}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Last update</td><td style="padding:8px 0;">{ctx.get('last_update_date', 'None')}</td></tr>
    </table>
    <p>This requires immediate follow-up.</p>
    """
    html = _base(subject, body, "/talent/projects", "View Project Dashboard")
    return subject, html
