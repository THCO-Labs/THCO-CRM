import { useState, useEffect } from "react";
import { 
  Users, 
  Clock, 
  MousePointer, 
  Eye, 
  Monitor, 
  Globe, 
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Tablet,
  Search,
  RefreshCw,
  User
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { analyticsAPI } from "../lib/api";
import { toast } from "sonner";

const Analytics = () => {
  const [summary, setSummary] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [pageViews, setPageViews] = useState(null);
  const [actions, setActions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const days = parseInt(timeRange);
      const [summaryData, usersData, sessionsData, pageViewsData, actionsData] = await Promise.all([
        analyticsAPI.getSummary(days),
        analyticsAPI.getUsers(days, 100),
        analyticsAPI.getSessions(days, 50),
        analyticsAPI.getPageViews(days),
        analyticsAPI.getActions(days, 50)
      ]);
      
      setSummary(summaryData);
      setUserAnalytics(usersData);
      setSessions(sessionsData);
      setPageViews(pageViewsData);
      setActions(actionsData);
    } catch (error) {
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const viewUserDetails = async (userId) => {
    try {
      const details = await analyticsAPI.getUserDetails(userId, parseInt(timeRange));
      setUserDetails(details);
      setSelectedUser(userId);
      setUserModalOpen(true);
    } catch (error) {
      toast.error("Failed to load user details");
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const filteredUsers = userAnalytics.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">User Analytics</h2>
          <p className="text-sm text-gray-500">Comprehensive insights into user behavior and platform usage</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-white border-gray-200">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAllData}
            className="border-gray-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.total_users || 0}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-green-600 font-medium">{summary?.active_users_today || 0} today</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">{summary?.active_users_week || 0} this week</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-pink-50 rounded-xl p-5 border border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.total_sessions || 0}</p>
              <p className="text-xs text-gray-500">Total Sessions</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Avg: {formatDuration(summary?.avg_session_duration / 60 || 0)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-5 border border-green-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary?.total_page_views || 0}</p>
              <p className="text-xs text-gray-500">Page Views</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            In last {timeRange} days
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <MousePointer className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(summary?.user_actions_summary || {}).reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-xs text-gray-500">User Actions</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Clicks, submissions, uploads
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">User Activity</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 pl-9 h-8 text-sm bg-gray-50 border-gray-200"
                />
              </div>
            </div>
          </div>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">User</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Sessions</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Time</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Pages</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Last Active</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-emerald-700">
                            {user.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.total_sessions}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(user.total_time_minutes)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.total_pages_viewed}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {getDeviceIcon(user.last_device)}
                        <span>{formatDate(user.last_active)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewUserDetails(user.user_id)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        View
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Stats */}
        <div className="space-y-6">
          {/* Most Visited Pages */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Most Visited Pages</h3>
            <div className="space-y-3">
              {summary?.most_visited_pages?.slice(0, 6).map((page, index) => (
                <div key={page.page} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400 w-4">{index + 1}</span>
                    <span className="text-sm text-gray-700 truncate max-w-[150px]">{page.page}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{page.views}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Device Types</h3>
            <div className="space-y-3">
              {Object.entries(summary?.device_breakdown || {}).map(([device, count]) => (
                <div key={device} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(device)}
                    <span className="text-sm text-gray-700">{device}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Browser Breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Browsers</h3>
            <div className="space-y-3">
              {Object.entries(summary?.browser_breakdown || {}).slice(0, 5).map(([browser, count]) => (
                <div key={browser} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 truncate max-w-[120px]">{browser}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Sessions</h3>
        </div>
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Started</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Duration</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Pages</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Device</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Browser</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <tr key={session.session_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{session.user_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(session.started_at)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(session.total_time_seconds / 60)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{session.page_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      {getDeviceIcon(session.device_type)}
                      <span>{session.device_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[100px]">{session.browser}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      session.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {session.is_active ? 'Active' : 'Ended'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="bg-white border-gray-200 max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p>{userDetails?.user?.name}</p>
                <p className="text-sm font-normal text-gray-500">{userDetails?.user?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {userDetails && (
            <div className="space-y-6 pt-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{userDetails.summary.total_sessions}</p>
                  <p className="text-xs text-gray-500">Sessions</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{formatDuration(userDetails.summary.total_time_minutes)}</p>
                  <p className="text-xs text-gray-500">Total Time</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{userDetails.summary.total_page_views}</p>
                  <p className="text-xs text-gray-500">Page Views</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{userDetails.summary.total_actions}</p>
                  <p className="text-xs text-gray-500">Actions</p>
                </div>
              </div>

              {/* Page Breakdown */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Most Visited Pages</h4>
                <div className="space-y-2">
                  {userDetails.page_breakdown.slice(0, 5).map((page, index) => (
                    <div key={page.page} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-700">{page.page}</span>
                      <span className="text-sm font-medium text-gray-900">{page.count} views</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userDetails.recent_page_views.slice(0, 10).map((view, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-700">{view.page_path}</span>
                      <span className="text-xs text-gray-500">{formatDate(view.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Analytics;
