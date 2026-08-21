import axios from 'axios';

// In a production build the backend serves this bundle, so the API lives on the
// same origin and the base URL must be relative. Hardcoding localhost:8000 sent
// every deployed request to the visitor's own machine, which failed silently and
// bounced the user back to the login screen.
// In development the CRA dev server (3000) and the API (8000) are separate
// origins, so fall back to localhost there. An explicit env var always wins.
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ??
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');
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
  
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    localStorage.removeItem('session_token');
    return response.data;
  },
  
  // Your own account. Separate from usersAPI.update, which is the admin
  // directory route and refuses everybody else -- which is why the profile
  // page's password form only ever worked for administrators.
  updateMe: async (data) => {
    const response = await apiClient.put('/auth/me', data);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
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

// Settings API
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

  // The stored CV cannot be reached with a plain <a href>: this client sends
  // its session as a Bearer header from localStorage, and a browser navigation
  // carries neither that header nor a cookie, so the request arrives
  // unauthenticated. Fetch it as a blob instead and hand the browser a local
  // URL, which keeps the PDF viewer while leaving the session where it is.
  openResumeFile: async (candidateId, version) => {
    const response = await apiClient.get(
      `/talent/candidates/${candidateId}/resume/file`,
      { params: version ? { version } : {}, responseType: 'blob' }
    );
    return URL.createObjectURL(response.data);
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
  // Duplicate review: pairs identity resolution declined to merge on its own.
  listMergeReviews: async (status = "pending") =>
    (await apiClient.get('/talent/merge-reviews', { params: { status } })).data,
  resolveMergeReview: async (reviewId, body) =>
    (await apiClient.post(`/talent/merge-reviews/${reviewId}/resolve`, body)).data,
  listResumeVersions: async (candidateId) =>
    (await apiClient.get(`/talent/candidates/${candidateId}/versions`)).data,
  gmailImportStatus: async () =>
    (await apiClient.get('/talent/import/gmail/status')).data,
  runGmailImport: async (limit = 50, dryRun = false) =>
    (await apiClient.post('/talent/import/gmail/run', null, { params: { limit, dry_run: dryRun } })).data,

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

// Crowther OS API (12-stage Project Management System)
export const flowAPI = {
  // Projects
  listProjects: async (params = {}) => (await apiClient.get('/flow/projects', { params })).data,
  getBoard: async () => (await apiClient.get('/flow/projects/board')).data,
  getProject: async (id) => (await apiClient.get(`/flow/projects/${id}`)).data,
  createProject: async (data) => (await apiClient.post('/flow/projects', data)).data,
  // Correcting details after creation. Scoped server-side: a team member may
  // only edit a project they are assigned to.
  updateProject: async (id, data) => (await apiClient.put(`/flow/projects/${id}`, data)).data,
  // The whole intended team, not a delta — two heads editing at once cannot
  // then interleave into a half-applied list. Newly added people are notified;
  // people already on it are not notified again.
  setCollaborators: async (id, collaboratorIds, managerIds = []) =>
    (await apiClient.put(`/flow/projects/${id}/collaborators`, {
      collaborator_ids: collaboratorIds,
      manager_ids: managerIds,
    })).data,
  // Name the person running this particular project. Null hands it back to
  // whoever manages the unit. Administrators only.
  setProjectManager: async (id, userId) =>
    (await apiClient.put(`/flow/projects/${id}/manager`, { user_id: userId || null })).data,
  // Archives by default; the record is restorable rather than destroyed.
  deleteProject: async (id, permanent = false) =>
    (await apiClient.delete(`/flow/projects/${id}`, { params: { permanent } })).data,
  restoreProject: async (id) => (await apiClient.post(`/flow/projects/${id}/restore`)).data,
  listArchivedProjects: async () => (await apiClient.get('/flow/projects-archived')).data,
  userProjects: async (userId) => (await apiClient.get(`/flow/projects/user/${userId}`)).data,
  // The lifecycle: stages, phases, gates and playbooks. Static between
  // requests, so it is one call rather than four, and it is the source the
  // browser should trust over its own copy in pages/flow/stages.js.
  meta: async () => (await apiClient.get('/flow/meta')).data,

  // What stands between this project and its next stage, plus the playbook
  // for the stage it is on. This is what the next-step panel renders.
  getGate: async (id) => (await apiClient.get(`/flow/projects/${id}/gate`)).data,

  // `force` advances past an unmet gate. The TSD alone, a reason is required,
  // and the Senior Partner is told every time.
  transitionStage: async (id, target_stage, note = '', payload = {}, force = false) =>
    (await apiClient.post(`/flow/projects/${id}/transition`, { target_stage, note, payload, force })).data,

  // Health is the TSD's call, and anything other than GREEN needs a reason.
  setHealth: async (id, health, reason = '') =>
    (await apiClient.post(`/flow/projects/${id}/health`, { health, reason })).data,

  // Stage 6. The TSD asks; the Senior Partner chooses; the stage waits.
  requestArchitect: async (id) =>
    (await apiClient.post(`/flow/projects/${id}/request-architect`)).data,
  // Everybody who can be put on a project. This used to be the staff of the
  // project's unit; a pod mixes people from across the capability teams, so
  // narrowing it to one unit made forming a correct pod impossible.
  staff: async () => (await apiClient.get('/flow/staff')).data,

  // The pod is everybody working on a project. It used to be called the
  // project team in one place and the pod in another; one name now.
  setPod: async (id, userIds) =>
    (await apiClient.put(`/flow/projects/${id}/pod`, { pod_member_ids: userIds })).data,

  architectCandidates: async () =>
    (await apiClient.get('/flow/architect-candidates')).data,
  selectArchitect: async (id, user_id) =>
    (await apiClient.post(`/flow/projects/${id}/select-architect`, { user_id })).data,

  // People holding a delivery function, for the assignment dropdowns.
  usersByFunction: async (functionRole) =>
    (await apiClient.get(`/flow/users-by-function/${functionRole}`)).data,
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
  deleteContact: async (id) => (await apiClient.delete(`/flow/contacts/${id}`)).data,

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
  updateTicket: async (id, data) => (await apiClient.put(`/flow/tickets/${id}`, data)).data,
  deleteTicket: async (id) => (await apiClient.delete(`/flow/tickets/${id}`)).data,

  // Messages
  listMessages: async (params = {}) => (await apiClient.get('/flow/messages', { params })).data,
  createMessage: async (data) => (await apiClient.post('/flow/messages', data)).data,
  messageAction: async (id, action, final_content = null) =>
    (await apiClient.post(`/flow/messages/${id}/action`, { action, final_content })).data,
  deleteMessage: async (id) => (await apiClient.delete(`/flow/messages/${id}`)).data,

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

// ---------------------------------------------------------------------------
// Crowther OS delivery artefacts
// ---------------------------------------------------------------------------
// What a project produces as it moves: requirements, the Product Brief, user
// journeys, uploaded architecture, demo rounds, client feedback, documents.
//
// There is deliberately no "architect brief" call. The architect reads the
// same project everyone else reads, from the moment they are named; a briefing
// package would be a copy, and a copy goes stale as soon as the project moves.
export const deliveryAPI = {
  // One request for the whole project page. Four tabs and six drawers over one
  // project is one round trip, not nine.
  workspace: async (id) =>
    (await apiClient.get(`/delivery/projects/${id}/workspace`)).data,

  // Requirements: the unit of scope. A board card is the unit of execution.
  requirements: async (id) =>
    (await apiClient.get(`/delivery/projects/${id}/requirements`)).data,
  addRequirement: async (id, body) =>
    (await apiClient.post(`/delivery/projects/${id}/requirements`, body)).data,
  updateRequirement: async (id, requirementId, body) =>
    (await apiClient.patch(`/delivery/projects/${id}/requirements/${requirementId}`, body)).data,
  deleteRequirement: async (id, requirementId) =>
    (await apiClient.delete(`/delivery/projects/${id}/requirements/${requirementId}`)).data,

  journeys: async (id) =>
    (await apiClient.get(`/delivery/projects/${id}/journeys`)).data,
  addJourney: async (id, body) =>
    (await apiClient.post(`/delivery/projects/${id}/journeys`, body)).data,
  updateJourney: async (id, journeyId, body) =>
    (await apiClient.patch(`/delivery/projects/${id}/journeys/${journeyId}`, body)).data,
  deleteJourney: async (id, journeyId) =>
    (await apiClient.delete(`/delivery/projects/${id}/journeys/${journeyId}`)).data,

  // Versioned, never overwritten. A brief that can be edited in place cannot
  // answer "what did we agree in June".
  productBriefs: async (id) =>
    (await apiClient.get(`/delivery/projects/${id}/product-briefs`)).data,
  addProductBrief: async (id, body) =>
    (await apiClient.post(`/delivery/projects/${id}/product-briefs`, body)).data,

  // Architecture is uploaded, not drawn. No canvas, no component graph.
  architecture: async (id) =>
    (await apiClient.get(`/delivery/projects/${id}/architecture`)).data,
  uploadArchitecture: async (id, file, title = '', note = '') => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    form.append('note', note);
    const response = await apiClient.post(
      `/delivery/projects/${id}/architecture`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  // Demos are a collection, not a field. Several rounds before the client
  // validates is normal, and the system should be able to say how many.
  demos: async (id) => (await apiClient.get(`/delivery/projects/${id}/demos`)).data,
  addDemo: async (id, body) =>
    (await apiClient.post(`/delivery/projects/${id}/demos`, body)).data,
  markDemoHeld: async (id, demoId) =>
    (await apiClient.post(`/delivery/projects/${id}/demos/${demoId}/held`)).data,
  setDemoOutcome: async (id, demoId, outcome, notes = '') =>
    (await apiClient.post(`/delivery/projects/${id}/demos/${demoId}/outcome`, { outcome, notes })).data,
  updateDemo: async (id, demoId, body) =>
    (await apiClient.patch(`/delivery/projects/${id}/demos/${demoId}`, body)).data,

  // Wireframes, a deck, a recording. Stored as project documents with
  // doc_type "demo", so they also appear under Documents. A prototype built in
  // an app builder is a link on the round instead; both satisfy the gate.
  demoMaterials: async (id, demoId) =>
    (await apiClient.get(`/delivery/projects/${id}/demos/${demoId}/materials`)).data,
  uploadDemoMaterial: async (id, demoId, file) => {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post(
      `/delivery/projects/${id}/demos/${demoId}/materials`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  feedback: async (id) => (await apiClient.get(`/delivery/projects/${id}/feedback`)).data,
  addFeedback: async (id, body) =>
    (await apiClient.post(`/delivery/projects/${id}/feedback`, body)).data,

  documents: async (id, docType) =>
    (await apiClient.get(`/delivery/projects/${id}/documents`,
      { params: docType ? { doc_type: docType } : {} })).data,
  addTranscript: async (id, body) =>
    (await apiClient.post(`/delivery/projects/${id}/transcripts`, body)).data,
  uploadDocument: async (id, file, title = '', docType = 'other') => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    form.append('doc_type', docType);
    const response = await apiClient.post(
      `/delivery/projects/${id}/documents`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
  deleteDocument: async (id, documentId) =>
    (await apiClient.delete(`/delivery/projects/${id}/documents/${documentId}`)).data,

  // An uploaded file cannot be reached with a plain <a href>. This client
  // sends its session as a Bearer header from localStorage, and a browser
  // navigation carries neither that header nor a cookie, so the request
  // arrives unauthenticated. In development it is worse than a 401: the
  // relative URL hits the dev server on :3000, finds no such route, and falls
  // through to the single-page app, so clicking a document silently lands on
  // the dashboard.
  //
  // Fetch it as a blob and hand the browser a local URL instead. The same
  // reasoning already governs CVs, task attachments and thumbnails.
  //
  // The caller owns the returned URL and must revoke it when done, or the
  // blob stays in memory for the life of the tab.
  openFile: async (fileUrl) => {
    // `file_url` comes back as /api/delivery/files/... and apiClient is
    // already based at /api, so the prefix is stripped rather than doubled.
    const path = fileUrl.replace(/^\/api/, '');
    const response = await apiClient.get(path, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },
};


// Task Board API (Trello-like boards + cards)
export const tasksAPI = {
  // Thumbnails: a shared pool of images, each usable by at most one task.
  // The server enforces that with a unique index, so a claim can legitimately
  // fail with 409 when somebody else took the image first.
  listThumbnails: async (ownerId) =>
    (await apiClient.get('/tasks/thumbnails', { params: ownerId ? { owner_id: ownerId } : {} })).data,
  uploadThumbnail: async (file) => {
    const form = new FormData();
    form.append('file', file);
    return (await apiClient.post('/tasks/thumbnails', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },
  // Cards and projects both hold pictures, and the id says which.
  claimThumbnail: async (ownerId, thumbnailId) =>
    (await apiClient.post(
      ownerId.startsWith('card_') ? `/tasks/cards/${ownerId}/thumbnail` : `/tasks/projects/${ownerId}/thumbnail`,
      { thumbnail_id: thumbnailId })).data,
  releaseThumbnail: async (ownerId) =>
    (await apiClient.delete(
      ownerId.startsWith('card_') ? `/tasks/cards/${ownerId}/thumbnail` : `/tasks/projects/${ownerId}/thumbnail`)).data,
  openThumbnail: async (thumbnailId) => {
    const response = await apiClient.get(`/tasks/thumbnails/${thumbnailId}/image`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },

  // Attachments on task cards. Upload is one call per file so a person can
  // pick as many as they like and one oversized file cannot fail the rest.
  listCardAttachments: async (cardId) =>
    (await apiClient.get(`/tasks/cards/${cardId}/attachments`)).data,
  uploadCardAttachment: async (cardId, file) => {
    const form = new FormData();
    form.append("file", file);
    return (
      await apiClient.post(`/tasks/cards/${cardId}/attachments`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },
  deleteCardAttachment: async (attachmentId) =>
    (await apiClient.delete(`/tasks/attachments/${attachmentId}`)).data,
  // Fetched as a blob, not linked to directly. This client carries its session
  // as a Bearer header from localStorage, and neither an <img src> nor a plain
  // link sends that -- the request would arrive unauthenticated and 401. Same
  // reason openResumeFile exists.
  openCardAttachment: async (attachmentId) => {
    const response = await apiClient.get(`/tasks/attachments/${attachmentId}`, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },

  // Projects — reuse Flow projects, annotated with board/task counts
  listProjectSummary: async () => (await apiClient.get('/tasks/projects/summary')).data,

  // Boards — always scoped to a project
  listBoards: async (projectId) =>
    (await apiClient.get('/tasks/boards', { params: { project_id: projectId } })).data,
  createBoard: async (projectId, title) =>
    (await apiClient.post('/tasks/boards', { project_id: projectId, title })).data,
  updateBoard: async (boardId, data) => (await apiClient.patch(`/tasks/boards/${boardId}`, data)).data,
  deleteBoard: async (boardId) => (await apiClient.delete(`/tasks/boards/${boardId}`)).data,

  // Cards
  createCard: async (boardId, data) => (await apiClient.post(`/tasks/boards/${boardId}/cards`, data)).data,
  updateCard: async (cardId, data) => (await apiClient.patch(`/tasks/cards/${cardId}`, data)).data,
  deleteCard: async (cardId) => (await apiClient.delete(`/tasks/cards/${cardId}`)).data,

  reorder: async (boardOrder, cards) =>
    (await apiClient.post('/tasks/reorder', { board_order: boardOrder, cards })).data,

  // Team Members (optionally scoped to a project's own members)
  listTeamMembers: async (projectId) =>
    (await apiClient.get('/tasks/team-members', { params: projectId ? { project_id: projectId } : {} })).data,

  // Labels (persistent, reusable)
  listLabels: async () => (await apiClient.get('/tasks/labels')).data,
  createLabel: async (data) => (await apiClient.post('/tasks/labels', data)).data,
  updateLabel: async (labelId, data) => (await apiClient.patch(`/tasks/labels/${labelId}`, data)).data,
  deleteLabel: async (labelId) => (await apiClient.delete(`/tasks/labels/${labelId}`)).data,

  // Sharing — one Google-Docs-style link per project (coordinator-managed)
  getShare: async (projectId) => (await apiClient.get(`/tasks/projects/${projectId}/share`)).data,
  generateShare: async (projectId) => (await apiClient.post(`/tasks/projects/${projectId}/share`)).data,
  regenerateShare: async (projectId) => (await apiClient.post(`/tasks/projects/${projectId}/share/regenerate`)).data,
  updateShare: async (projectId, data) => (await apiClient.patch(`/tasks/projects/${projectId}/share`, data)).data,

  // Public shared board — consumed anonymously via the share token
  getSharedBoard: async (token) => (await apiClient.get(`/tasks/shared/${token}`)).data,
  createSharedCard: async (token, boardId, data) =>
    (await apiClient.post(`/tasks/shared/${token}/boards/${boardId}/cards`, data)).data,
  updateSharedCard: async (token, cardId, data) =>
    (await apiClient.patch(`/tasks/shared/${token}/cards/${cardId}`, data)).data,
  reorderShared: async (token, cards) =>
    (await apiClient.post(`/tasks/shared/${token}/reorder`, { cards })).data,
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
  // The staff assigned to one unit. Open to that unit's head as well as
  // administrators, so a head can pick a project team without needing the
  // full staff directory.
  listStaff: async (slug) => (await apiClient.get(`/units/${slug}/staff`)).data,
  // Appoint, change or clear a unit's head. A unit has one head, so this
  // replaces whoever held it. Pass null to leave the unit without one.
  setHead: async (slug, userId) => {
    const response = await apiClient.put(`/units/${slug}/head`, { user_id: userId || null });
    return response.data;
  },
};

export const notificationsAPI = {
  list: async (params = {}) => (await apiClient.get('/notifications', { params })).data,
  unreadCount: async () => (await apiClient.get('/notifications/unread-count')).data,
  // Omit the id to mark everything read.
  markRead: async (notificationId) =>
    (await apiClient.post('/notifications/read', { notification_id: notificationId || null })).data,
};

export default apiClient;

