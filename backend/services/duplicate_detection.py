"""
FlowForge Duplicate Detection Service
Checks for similar existing workflows before allowing new tool creation
"""

import os
import logging
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from supabase import create_client, Client
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Supabase
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

supabase: Client = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def extract_keywords(text: str) -> List[str]:
    """Extract meaningful keywords from text for matching"""
    # Common words to exclude
    stop_words = {
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of',
        'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
        'during', 'before', 'after', 'above', 'below', 'between', 'under',
        'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
        'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
        'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
        'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while',
        'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
        'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
        'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
        'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this',
        'that', 'these', 'those', 'am', 'build', 'create', 'make', 'want', 'need',
        'something', 'tool', 'automation', 'automate', 'help', 'please', 'call',
        # n8n technical terms to exclude
        'nodes', 'base', 'n8n', 'trigger', 'node', 'httprequest', 'code',
        'formtrigger', 'webhooktrigger', 'scheduletrigger', 'manualtrigger',
        'splitinbatches', 'wait', 'switch', 'merge', 'set', 'function',
        'correct', 'version', 'thco'
    }
    
    # Extract words
    words = re.findall(r'\b[a-z]+\b', text.lower())
    
    # Filter and return unique keywords
    keywords = [w for w in words if w not in stop_words and len(w) > 2]
    return list(set(keywords))


def calculate_keyword_similarity(keywords1: List[str], keywords2: List[str]) -> float:
    """Calculate similarity score based on keyword overlap"""
    if not keywords1 or not keywords2:
        return 0.0
    
    set1 = set(keywords1)
    set2 = set(keywords2)
    
    intersection = len(set1 & set2)
    union = len(set1 | set2)
    
    if union == 0:
        return 0.0
    
    return (intersection / union) * 100


async def search_similar_workflows(
    user_description: str,
    unit: Optional[str] = None,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Search for workflows similar to the user's description
    Returns list of similar workflows with similarity scores
    """
    if not supabase:
        logger.error("Supabase not initialized")
        return []
    
    try:
        # Extract keywords from user description
        user_keywords = extract_keywords(user_description)
        
        # Get ALL workflows from inventory (don't filter by unit since inventory workflows
        # are synced from n8n and typically don't have unit assignments)
        query = supabase.table('flowforge_workflow_inventory').select('*')
        # Don't filter inventory by unit - we want to find ALL similar workflows
        
        result = query.execute()
        workflows = result.data or []
        
        # Also get FlowForge conversations (deployed tools)
        # For conversations, we CAN filter by unit since they have unit assignments
        conv_query = supabase.table('flowforge_conversations').select('*').in_('status', ['deployed', 'active'])
        if unit:
            conv_query = conv_query.eq('unit', unit)
        
        conv_result = conv_query.execute()
        conversations = conv_result.data or []
        
        # Calculate similarity scores
        scored_results = []
        
        # Score inventory workflows
        for wf in workflows:
            wf_text = f"{wf.get('name', '')} {wf.get('description', '')} {wf.get('nodes_summary', '')}"
            wf_keywords = extract_keywords(wf_text)
            
            score = calculate_keyword_similarity(user_keywords, wf_keywords)
            
            if score > 0:
                scored_results.append({
                    'id': wf['id'],
                    'source': 'inventory',
                    'name': wf['name'],
                    'description': wf.get('description', ''),
                    'unit': wf.get('unit'),
                    'is_active': wf.get('is_active', False),
                    'trigger_type': wf.get('trigger_type'),
                    'nodes_summary': wf.get('nodes_summary'),
                    'is_flowforge_created': wf.get('is_flowforge_created', False),
                    'similarity_score': round(score, 1),
                    'engine_workflow_id': wf.get('engine_workflow_id')
                })
        
        # Score FlowForge conversations
        for conv in conversations:
            conv_text = f"{conv.get('tool_name', '')} {conv.get('description', '')} {' '.join(conv.get('systems_used', []))}"
            conv_keywords = extract_keywords(conv_text)
            
            score = calculate_keyword_similarity(user_keywords, conv_keywords)
            
            if score > 0:
                scored_results.append({
                    'id': conv['id'],
                    'source': 'flowforge',
                    'name': conv.get('tool_name', 'Untitled'),
                    'description': conv.get('description', ''),
                    'unit': conv.get('unit'),
                    'is_active': conv.get('status') == 'active',
                    'trigger_type': conv.get('trigger_type'),
                    'systems_used': conv.get('systems_used', []),
                    'is_flowforge_created': True,
                    'similarity_score': round(score, 1),
                    'conversation_id': conv['id']
                })
        
        # Sort by similarity score descending
        scored_results.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        return scored_results[:limit]
    
    except Exception as e:
        logger.error(f"Error searching similar workflows: {e}")
        return []


async def check_for_duplicates(
    user_description: str,
    unit: Optional[str] = None,
    threshold: float = 20.0
) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Check if there are potential duplicate workflows
    
    Returns:
        Tuple of (has_duplicates, similar_workflows)
        - has_duplicates: True if similarity > 70%
        - similar_workflows: List of similar workflows above threshold
    """
    similar = await search_similar_workflows(user_description, unit, limit=5)
    
    # Filter by threshold
    above_threshold = [w for w in similar if w['similarity_score'] >= threshold]
    
    # Check for strong matches (>70%)
    has_strong_match = any(w['similarity_score'] >= 70 for w in above_threshold)
    
    return has_strong_match, above_threshold


async def get_ai_duplicate_analysis(
    user_description: str,
    similar_workflows: List[Dict[str, Any]]
) -> str:
    """
    Use AI to generate a natural language response about similar workflows
    """
    if not EMERGENT_LLM_KEY or not similar_workflows:
        return None
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"duplicate-check-{datetime.now().timestamp()}",
            system_message="""You are FlowForge's duplicate detection assistant. 
Your job is to compare user's request with existing similar tools and provide a helpful, concise response.
NEVER mention technical names like n8n, Claude, Supabase - use friendly names like 'THCO automation engine' or 'database'.
Be conversational and helpful."""
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Build context
        workflow_descriptions = []
        for wf in similar_workflows[:3]:  # Top 3
            desc = f"- {wf['name']} ({wf['similarity_score']}% similar)"
            if wf.get('description'):
                desc += f": {wf['description'][:100]}"
            if wf.get('is_active'):
                desc += " [ACTIVE]"
            workflow_descriptions.append(desc)
        
        prompt = f"""User wants to build: "{user_description}"

I found these similar existing tools:
{chr(10).join(workflow_descriptions)}

Generate a brief, friendly message (2-3 sentences) alerting the user about these similar tools. 
Ask if they want to use an existing one, request updates to it, or build something new."""

        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        return response
    
    except Exception as e:
        logger.error(f"AI duplicate analysis error: {e}")
        return None


def generate_duplicate_alert_data(
    similar_workflows: List[Dict[str, Any]],
    strongest_match: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate structured data for the duplicate alert UI component
    """
    return {
        'has_strong_match': strongest_match['similarity_score'] >= 70,
        'strongest_match': {
            'id': strongest_match['id'],
            'name': strongest_match['name'],
            'description': strongest_match.get('description', ''),
            'unit': strongest_match.get('unit'),
            'similarity_score': strongest_match['similarity_score'],
            'is_active': strongest_match.get('is_active', False),
            'source': strongest_match.get('source', 'inventory'),
            'conversation_id': strongest_match.get('conversation_id'),
        },
        'other_matches': [
            {
                'id': wf['id'],
                'name': wf['name'],
                'similarity_score': wf['similarity_score'],
            }
            for wf in similar_workflows[1:3]  # Next 2 matches
        ],
        'action_buttons': [
            {'label': 'Yes, use this one', 'action': 'use_existing', 'primary': True},
            {'label': 'Close, but needs changes', 'action': 'request_update', 'primary': False},
            {'label': 'No, build something new', 'action': 'build_new', 'primary': False},
        ]
    }
