import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios defaults
const apiClient = axios.create({
  baseURL: API,
  withCredentials: false,
  timeout: 180000, // 3 minute default timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: async (data) => {
    const response = await apiClient.post('/auth/register', data);
    if (response.data?.session_token) {
      localStorage.setItem('session_token', response.data.session_token);
    }
    return response.data;
  },
  
  login: async (data) => {
    const response = await apiClient.post('/auth/login', data);
    if (response.data?.session_token) {
      localStorage.setItem('session_token', response.data.session_token);
    }
    return response.data;
  },
  
  exchangeSession: async (sessionId) => {
    const response = await apiClient.post('/auth/session', {}, {
      headers: { 'X-Session-ID': sessionId }
    });
    if (response.data?.session_token) {
      localStorage.setItem('session_token', response.data.session_token);
    }
    return response.data;
  },
  
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    localStorage.removeItem('session_token');
    return response.data;
  },
  
  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },
  
  resetPassword: async (token, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', { token, new_password: newPassword });
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },
  
  create: async (data) => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },
  
  update: async (userId, data) => {
    const response = await apiClient.put(`/users/${userId}`, data);
    return response.data;
  },
  
  delete: async (userId) => {
    const response = await apiClient.delete(`/users/${userId}`);
    return response.data;
  },
  
  lockDevice: async (userId) => {
    const response = await apiClient.post(`/users/${userId}/lock-device`);
    return response.data;
  },
  
  unlockDevice: async (userId) => {
    const response = await apiClient.post(`/users/${userId}/unlock-device`);
    return response.data;
  },
  
  updateDevice: async (userId) => {
    const response = await apiClient.post(`/users/${userId}/update-device`);
    return response.data;
  },
};

// Sourcing Requests API
export const sourcingAPI = {
  create: async (data) => {
    const response = await apiClient.post('/sourcing-requests', data);
    return response.data;
  },
  
  getAll: async () => {
    const response = await apiClient.get('/sourcing-requests');
    return response.data;
  },
};

// Database Search API
export const databaseSearchAPI = {
  create: async (data) => {
    const response = await apiClient.post('/database-searches', data);
    return response.data;
  },
  
  getAll: async () => {
    const response = await apiClient.get('/database-searches');
    return response.data;
  },
};

// Talent API - Candidate database, CV parsing, sourcing
export const talentAPI = {
  // Candidate CRUD
  uploadCV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/talent/candidates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadBulkCV: async (files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const response = await apiClient.post('/talent/candidates/upload-bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    });
    return response.data;
  },

  listCandidates: async (params = {}) => {
    const response = await apiClient.get('/talent/candidates', { params });
    return response.data;
  },

  getCandidate: async (candidateId) => {
    const response = await apiClient.get(`/talent/candidates/${candidateId}`);
    return response.data;
  },

  updateCandidate: async (candidateId, data) => {
    const response = await apiClient.put(`/talent/candidates/${candidateId}`, data);
    return response.data;
  },

  deleteCandidate: async (candidateId) => {
    const response = await apiClient.delete(`/talent/candidates/${candidateId}`);
    return response.data;
  },

  searchBySkills: async (skills) => {
    const response = await apiClient.post('/talent/candidates/search-by-skills', skills);
    return response.data;
  },

  // Google Drive
  listDriveFiles: async (params = {}) => {
    const response = await apiClient.get('/talent/drive/files', { params });
    return response.data;
  },

  importFromDrive: async (data) => {
    const response = await apiClient.post('/talent/drive/import', data, { timeout: 600000 });
    return response.data;
  },

  // External Sourcing (Google Search)
  searchExternal: async (data) => {
    const response = await apiClient.post('/talent/sourcing/search', data, { timeout: 60000 });
    return response.data;
  },

  buildBooleanPack: async (data) => {
    const response = await apiClient.post('/talent/sourcing/boolean-pack', data);
    return response.data;
  },

  importExternal: async (data) => {
    const response = await apiClient.post('/talent/sourcing/import', data);
    return response.data;
  },

  // AI-enhanced CV parsing
  aiParseCv: async (rawText) => {
    const response = await apiClient.post('/talent/candidates/ai-parse', { raw_text: rawText }, { timeout: 30000 });
    return response.data;
  },

  // JD Analysis
  analyzeJd: async (data) => {
    const response = await apiClient.post('/talent/sourcing/analyze-jd', data, { timeout: 60000 });
    return response.data;
  },

  // Full-text search
  textSearch: async (q, params = {}) => {
    const response = await apiClient.get('/talent/candidates/text-search', { params: { q, ...params } });
    return response.data;
  },

  // Unified search (internal + external)
  unifiedSearch: async (data) => {
    const response = await apiClient.post('/talent/unified-search', data, { timeout: 120000 });
    return response.data;
  },

  // Talent Intelligence Network
  listNetworkCandidates: async (params = {}) => {
    const response = await apiClient.get('/talent/network/candidates', { params });
    return response.data;
  },

  getNetworkCandidate: async (candidateId) => {
    const response = await apiClient.get(`/talent/network/candidates/${candidateId}`);
    return response.data;
  },

  enrichNetworkCandidate: async (candidateId) => {
    const response = await apiClient.post(`/talent/network/candidates/${candidateId}/enrich`);
    return response.data;
  },

  refreshNetworkCandidate: async (candidateId) => {
    const response = await apiClient.post(`/talent/network/candidates/${candidateId}/refresh`);
    return response.data;
  },

  importNetworkCandidate: async (candidateId) => {
    const response = await apiClient.post(`/talent/network/candidates/${candidateId}/import`);
    return response.data;
  },

  deleteNetworkCandidate: async (candidateId) => {
    const response = await apiClient.delete(`/talent/network/candidates/${candidateId}`);
    return response.data;
  },

  // `provider` and `queryInfo` drive the credit/analytics record, so the
  // search that produced these candidates must pass them through.
  saveDiscovered: async (candidates, provider, queryInfo, durationMs) => {
    const response = await apiClient.post('/talent/network/save-discovered', {
      candidates,
      provider: provider || 'duckduckgo',
      query_info: queryInfo || null,
      duration_ms: durationMs || null,
    });
    return response.data;
  },

  getNetworkStats: async () => {
    const response = await apiClient.get('/talent/network/stats');
    return response.data;
  },

  // Stats
  getStats: async () => {
    const response = await apiClient.get('/talent/stats');
    return response.data;
  },
};

// Settings API
export const settingsAPI = {
  getWebhooks: async () => {
    const response = await apiClient.get('/settings/webhooks');
    return response.data;
  },
  
  updateWebhooks: async (data) => {
    const response = await apiClient.put('/settings/webhooks', data);
    return response.data;
  },
  
  testWebhook: async (webhookType, url) => {
    const response = await apiClient.post(`/settings/webhooks/test?webhook_type=${webhookType}&url=${encodeURIComponent(url)}`);
    return response.data;
  },
};

// Activity Logs API
export const activityAPI = {
  getLogs: async (params = {}) => {
    const response = await apiClient.get('/activity-logs', { params });
    return response.data;
  },
  
  getCount: async () => {
    const response = await apiClient.get('/activity-logs/count');
    return response.data;
  },
};

// Login Records API
export const loginRecordsAPI = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/login-records', { params });
    return response.data;
  },
  
  getCount: async () => {
    const response = await apiClient.get('/login-records/count');
    return response.data;
  },
  
  getByUser: async (userId, limit = 20) => {
    const response = await apiClient.get(`/login-records/user/${userId}?limit=${limit}`);
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },
};

// Clients API
export const clientsAPI = {
  getAll: async () => {
    const response = await apiClient.get('/clients');
    return response.data;
  },
  
  create: async (data) => {
    const response = await apiClient.post('/clients', data);
    return response.data;
  },
  
  update: async (clientId, data) => {
    const response = await apiClient.put(`/clients/${clientId}`, data);
    return response.data;
  },
  
  delete: async (clientId) => {
    const response = await apiClient.delete(`/clients/${clientId}`);
    return response.data;
  },
  
  getProposals: async (clientId) => {
    const response = await apiClient.get(`/clients/${clientId}/proposals`);
    return response.data;
  },
  
  uploadProposal: async (clientId, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(`/clients/${clientId}/proposals`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },
};

// Proposals API
export const proposalsAPI = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/proposals', { params });
    return response.data;
  },
  
  delete: async (proposalId) => {
    const response = await apiClient.delete(`/proposals/${proposalId}`);
    return response.data;
  },
  
  regenerateLink: async (proposalId) => {
    const response = await apiClient.post(`/proposals/${proposalId}/regenerate-link`);
    return response.data;
  },
  
  getShared: async (shareToken) => {
    const response = await apiClient.get(`/proposals/shared/${shareToken}`);
    return response.data;
  },
  
  getDownloadUrl: (shareToken) => {
    return `${API}/proposals/shared/${shareToken}/download`;
  },
};

// Analytics API
export const analyticsAPI = {
  getSummary: async (days = 30) => {
    const response = await apiClient.get(`/analytics/summary?days=${days}`);
    return response.data;
  },
  
  getUsers: async (days = 30, limit = 50) => {
    const response = await apiClient.get(`/analytics/users?days=${days}&limit=${limit}`);
    return response.data;
  },
  
  getSessions: async (days = 7, limit = 100) => {
    const response = await apiClient.get(`/analytics/sessions?days=${days}&limit=${limit}`);
    return response.data;
  },
  
  getPageViews: async (days = 7) => {
    const response = await apiClient.get(`/analytics/page-views?days=${days}`);
    return response.data;
  },
  
  getActions: async (days = 7, limit = 100) => {
    const response = await apiClient.get(`/analytics/actions?days=${days}&limit=${limit}`);
    return response.data;
  },
  
  getUserDetails: async (userId, days = 30) => {
    const response = await apiClient.get(`/analytics/user/${userId}?days=${days}`);
    return response.data;
  },
  
  trackPageView: async (pagePath, pageTitle = '', referrer = '') => {
    try {
      await apiClient.post('/analytics/page-view', { page_path: pagePath, page_title: pageTitle, referrer });
    } catch (e) {
      // Silently fail
    }
  },
  
  trackAction: async (actionType, actionTarget, actionDetails = {}, pagePath = '') => {
    try {
      await apiClient.post('/analytics/action', { 
        action_type: actionType, 
        action_target: actionTarget, 
        action_details: actionDetails,
        page_path: pagePath 
      });
    } catch (e) {
      // Silently fail
    }
  },
  
  startSession: async () => {
    try {
      const response = await apiClient.post('/analytics/session/start');
      return response.data.session_id;
    } catch (e) {
      return null;
    }
  },
  
  endSession: async () => {
    try {
      await apiClient.post('/analytics/session/end');
    } catch (e) {
      // Silently fail
    }
  },
  
  heartbeat: async (sessionId, pagePath, timeOnPage) => {
    try {
      await apiClient.post('/analytics/heartbeat', { 
        session_id: sessionId, 
        page_path: pagePath, 
        time_on_page: timeOnPage 
      });
    } catch (e) {
      // Silently fail
    }
  },
};

// FlowForge API
export const flowforgeAPI = {
  // Health check
  health: async () => {
    const response = await apiClient.get('/flowforge/health');
    return response.data;
  },
  
  // Conversations
  getConversations: async (params = {}) => {
    const response = await apiClient.get('/flowforge/conversations', { params });
    return response.data;
  },
  
  createConversation: async (data) => {
    const response = await apiClient.post('/flowforge/conversations', data);
    return response.data;
  },
  
  getConversation: async (conversationId) => {
    const response = await apiClient.get(`/flowforge/conversations/${conversationId}`);
    return response.data;
  },
  
  updateConversation: async (conversationId, data) => {
    const response = await apiClient.patch(`/flowforge/conversations/${conversationId}`, data);
    return response.data;
  },
  
  // Messages
  getMessages: async (conversationId) => {
    const response = await apiClient.get(`/flowforge/conversations/${conversationId}/messages`);
    return response.data;
  },
  
  addMessage: async (conversationId, data) => {
    const response = await apiClient.post(`/flowforge/conversations/${conversationId}/messages`, data);
    return response.data;
  },
  
  // Approvals
  getApprovals: async (params = {}) => {
    const response = await apiClient.get('/flowforge/approvals', { params });
    return response.data;
  },
  
  createApproval: async (data) => {
    const response = await apiClient.post('/flowforge/approvals', data);
    return response.data;
  },
  
  getApproval: async (approvalId) => {
    const response = await apiClient.get(`/flowforge/approvals/${approvalId}`);
    return response.data;
  },
  
  processApproval: async (approvalId, action, note = null) => {
    const response = await apiClient.post(`/flowforge/approvals/${approvalId}/action`, { action, note });
    return response.data;
  },
  
  getApprovalStats: async () => {
    const response = await apiClient.get('/flowforge/approvals/stats');
    return response.data;
  },
  
  // Admins
  getAdmins: async () => {
    const response = await apiClient.get('/flowforge/admins');
    return response.data;
  },
  
  addAdmin: async (data) => {
    const response = await apiClient.post('/flowforge/admins', data);
    return response.data;
  },
  
  removeAdmin: async (adminId) => {
    const response = await apiClient.delete(`/flowforge/admins/${adminId}`);
    return response.data;
  },
  
  getUnitAdmins: async (unit) => {
    const response = await apiClient.get(`/flowforge/admins/for-unit/${unit}`);
    return response.data;
  },
  
  // Integrations
  getIntegrations: async () => {
    const response = await apiClient.get('/flowforge/integrations');
    return response.data;
  },
  
  checkIntegrations: async (integrationTypes) => {
    const response = await apiClient.post('/flowforge/integrations/check', { integration_types: integrationTypes });
    return response.data;
  },
  
  syncIntegrations: async () => {
    const response = await apiClient.post('/flowforge/integrations/sync');
    return response.data;
  },
  
  // Workflow Inventory
  getInventory: async (params = {}) => {
    const response = await apiClient.get('/flowforge/inventory', { params });
    return response.data;
  },
  
  syncInventory: async () => {
    const response = await apiClient.post('/flowforge/inventory/sync');
    return response.data;
  },
  
  searchInventory: async (query, limit = 10) => {
    const response = await apiClient.post('/flowforge/inventory/search', { query, limit });
    return response.data;
  },
  
  // AI Generation - longer timeout for complex generation
  generateResponse: async (conversationId, message, includeHistory = true, checkDuplicates = true) => {
    const response = await apiClient.post('/flowforge/generate', {
      conversation_id: conversationId,
      message,
      include_history: includeHistory,
      check_duplicates: checkDuplicates
    }, {
      timeout: 180000 // 3 minutes timeout for AI generation
    });
    return response.data;
  },
  
  // Voice Transcription
  transcribeAudio: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    const response = await apiClient.post('/flowforge/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Deployed Tools
  getDeployedTools: async (params = {}) => {
    const response = await apiClient.get('/flowforge/tools', { params });
    return response.data;
  },
  
  getDeployedTool: async (toolId) => {
    const response = await apiClient.get(`/flowforge/tools/${toolId}`);
    return response.data;
  },
  
  activateTool: async (toolId, active = true) => {
    const response = await apiClient.post(`/flowforge/tools/${toolId}/activate`, null, {
      params: { active }
    });
    return response.data;
  },
  
  // Intelligent Workflow Design
  designWorkflow: async (userInput, voiceTranscription = null, unit = "general") => {
    const response = await apiClient.post('/flowforge/design-workflow', {
      user_input: userInput,
      voice_transcription: voiceTranscription,
      unit: unit
    });
    return response.data;
  },
  
  // Get available integrations
  getAvailableIntegrations: async () => {
    const response = await apiClient.get('/flowforge/integrations/available');
    return response.data;
  },
  
  // Get form fields for a tool
  getToolFormFields: async (toolId) => {
    const response = await apiClient.get(`/flowforge/tools/${toolId}/form-fields`);
    return response.data;
  },
  
  // Execute a tool with form data
  executeTool: async (toolId, formData) => {
    const response = await apiClient.post(`/flowforge/tools/${toolId}/execute`, {
      form_data: formData
    }, {
      timeout: 120000 // 2 minutes timeout for execution
    });
    return response.data;
  },
};

// THCO Flow API (12-stage Project Management System)
export const flowAPI = {
  // Projects
  listProjects: async (params = {}) => (await apiClient.get('/flow/projects', { params })).data,
  getBoard: async () => (await apiClient.get('/flow/projects/board')).data,
  getProject: async (id) => (await apiClient.get(`/flow/projects/${id}`)).data,
  createProject: async (data) => (await apiClient.post('/flow/projects', data)).data,
  transitionStage: async (id, target_stage, note = '', payload = {}) =>
    (await apiClient.post(`/flow/projects/${id}/transition`, { target_stage, note, payload })).data,
  loseProject: async (id, reason) =>
    (await apiClient.post(`/flow/projects/${id}/lose`, null, { params: { reason } })).data,
  assignOwner: async (id, delivery_owner_id) =>
    (await apiClient.post(`/flow/projects/${id}/assign-owner`, { delivery_owner_id })).data,

  // Build track (status indicator + comment thread)
  buildUpdate: async (id, status, comment) =>
    (await apiClient.post(`/flow/projects/${id}/build-update`, { status, comment })).data,
  buildComments: async (id) =>
    (await apiClient.get(`/flow/projects/${id}/build-comments`)).data,

  // Users by role flag (for assignment dropdowns)
  usersByRole: async (flag) =>
    (await apiClient.get(`/flow/users-by-role/${flag}`)).data,

  // Add to flowAPI:
  emailHealth: async () => (await apiClient.get('/flow/dashboard/email-health')).data,

  // Project-scoped contacts (Client Profile)
  projectContacts: async (id) => (await apiClient.get(`/flow/projects/${id}/contacts`)).data,

  // Milestones
  createMilestone: async (data) => (await apiClient.post('/flow/milestones', data)).data,
  deliverMilestone: async (id) => (await apiClient.post(`/flow/milestones/${id}/deliver`)).data,

  // Contacts
  listContacts: async (params = {}) => (await apiClient.get('/flow/contacts', { params })).data,
  createContact: async (data) => (await apiClient.post('/flow/contacts', data)).data,
  getContact: async (id) => (await apiClient.get(`/flow/contacts/${id}`)).data,
  updateContact: async (id, data) => (await apiClient.put(`/flow/contacts/${id}`, data)).data,

  // Events
  listEvents: async (days = 90) => (await apiClient.get('/flow/events', { params: { days } })).data,

  // Prospects
  listProspects: async (params = {}) => (await apiClient.get('/flow/prospects', { params })).data,
  createProspect: async (data) => (await apiClient.post('/flow/prospects', data)).data,
  updateProspectStatus: async (id, status) =>
    (await apiClient.post(`/flow/prospects/${id}/status`, { status })).data,

  // Tickets
  listTickets: async (params = {}) => (await apiClient.get('/flow/tickets', { params })).data,
  createTicket: async (data) => (await apiClient.post('/flow/tickets', data)).data,
  updateTicketStatus: async (id, status) =>
    (await apiClient.post(`/flow/tickets/${id}/status`, { status })).data,

  // Messages
  listMessages: async (params = {}) => (await apiClient.get('/flow/messages', { params })).data,
  createMessage: async (data) => (await apiClient.post('/flow/messages', data)).data,
  messageAction: async (id, action, final_content = null) =>
    (await apiClient.post(`/flow/messages/${id}/action`, { action, final_content })).data,

  // Questions
  listQuestions: async (industry) => (await apiClient.get('/flow/questions', { params: industry ? { industry } : {} })).data,
  addQuestion: async (data) => (await apiClient.post('/flow/questions', data)).data,
  deleteQuestion: async (id) => (await apiClient.delete(`/flow/questions/${id}`)).data,

  // Audit log
  listAudit: async (params = {}) => (await apiClient.get('/flow/audit-log', { params })).data,

  // Roles
  listRoles: async () => (await apiClient.get('/flow/roles')).data,
  assignRole: async (user_id, flag, value) =>
    (await apiClient.post('/flow/roles/assign', { user_id, flag, value })).data,

  // Dashboard
  getDashboard: async () => (await apiClient.get('/flow/dashboard')).data,
};

// Assessment API (public endpoints - no auth needed)
export const assessmentAPI = {
  start: async (data) => {
    const response = await apiClient.post('/assessments/start', data);
    return response.data;
  },
  lookup: async (email) => {
    const response = await apiClient.get(`/assessments/lookup?email=${encodeURIComponent(email)}`);
    return response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/assessments/by-id/${id}`);
    return response.data;
  },
  saveAnswers: async (id, answers) => {
    const response = await apiClient.put(`/assessments/${id}/answers`, { answers });
    return response.data;
  },
  saveTimer: async (id, timerData) => {
    const response = await apiClient.put(`/assessments/${id}/timer`, timerData);
    return response.data;
  },
  saveFinal: async (id, data) => {
    const response = await apiClient.put(`/assessments/${id}/final`, data);
    return response.data;
  },
  // Admin endpoints (use apiClient with credentials)
  adminList: async (statusFilter = 'all') => {
    const response = await apiClient.get(`/assessments/admin/list?status_filter=${statusFilter}`);
    return response.data;
  },
  adminGet: async (id) => {
    const response = await apiClient.get(`/assessments/admin/${id}`);
    return response.data;
  },
  adminExportJson: () => `${process.env.REACT_APP_BACKEND_URL}/api/assessments/admin/export/json`,
  adminExportCsv: () => `${process.env.REACT_APP_BACKEND_URL}/api/assessments/admin/export/csv`,
  adminExportSingle: (id) => `${process.env.REACT_APP_BACKEND_URL}/api/assessments/admin/${id}/export`,
};

// Feedback & IT Support API
export const feedbackAPI = {
  create: async (data) => {
    const response = await apiClient.post('/feedback', data);
    return response.data;
  },
  getMine: async () => {
    const response = await apiClient.get('/feedback/mine');
    return response.data;
  },
  getAll: async () => {
    const response = await apiClient.get('/feedback/all');
    return response.data;
  },
  getOne: async (id) => {
    const response = await apiClient.get(`/feedback/${id}`);
    return response.data;
  },
  update: async (id, data) => {
    const response = await apiClient.patch(`/feedback/${id}`, data);
    return response.data;
  },
  getStatuses: async () => {
    const response = await apiClient.get('/feedback/meta/statuses');
    return response.data;
  },
};

// Business Units API
export const unitsAPI = {
  list: async () => {
    const response = await apiClient.get('/units');
    return response.data;
  },
  get: async (slug) => {
    const response = await apiClient.get(`/units/${slug}`);
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/units', data);
    return response.data;
  },
  update: async (slug, data) => {
    const response = await apiClient.patch(`/units/${slug}`, data);
    return response.data;
  },
  remove: async (slug) => {
    const response = await apiClient.delete(`/units/${slug}`);
    return response.data;
  },
  invite: async (slug, data) => {
    const response = await apiClient.post(`/units/${slug}/invite`, data);
    return response.data;
  },
};

export default apiClient;

