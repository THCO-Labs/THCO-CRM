import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Rocket, Loader2, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import { sourcingAPI, authAPI } from "../lib/api";
import { toast } from "sonner";

const sourcingSchema = z.object({
  job_title: z.string().min(1, "Job title is required"),
  job_description: z.string().min(1, "Job description is required"),
  company_name: z.string().min(1, "Company name is required"),
  company_website: z.string().url("Please enter a valid URL"),
  company_location: z.string().min(1, "Company location is required"),
  hiring_locations: z.string().min(1, "Hiring locations are required"),
  salary_budget: z.string().optional(),
  target_companies: z.string().optional(),
  companies_to_exclude: z.string().optional(),
  accept_n_minus_one: z.string().min(1, "This field is required"),
  industry_segments: z.string().optional(),
  additional_notes: z.string().optional(),
  assigned_recruiter: z.string().min(1, "Assigned recruiter is required"),
});

const SourcingTool = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [user, setUser] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(sourcingSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, requestsData] = await Promise.all([
          authAPI.getMe(),
          sourcingAPI.getAll()
        ]);
        setUser(userData);
        setRequests(requestsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await sourcingAPI.create(data);
      toast.success("Sourcing request submitted successfully. Results will be delivered to your email within 10 minutes.");
      reset();
      const updatedRequests = await sourcingAPI.getAll();
      setRequests(updatedRequests);
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to submit request";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      submitted: "bg-amber-50 text-amber-600 border-amber-200",
      processing: "bg-emerald-50 text-emerald-600 border-emerald-200",
      completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
      failed: "bg-red-50 text-red-600 border-red-200",
    };
    return (
      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border ${styles[status] || styles.submitted}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6" data-testid="sourcing-tool-page">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/talent" className="text-gray-500 hover:text-gray-900">Talent & Delivery</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-gray-900 font-medium">AI Candidate Sourcing</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Tool Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Search className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Candidate Sourcing</h1>
          <p className="text-gray-500">Source candidates from the open web using AI</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="new-request" className="w-full">
        <TabsList className="bg-gray-100 border border-gray-200 p-1 rounded-xl">
          <TabsTrigger 
            value="new-request" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-lg"
            data-testid="new-request-tab"
          >
            New Request
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-lg"
            data-testid="history-tab"
          >
            Request History
          </TabsTrigger>
        </TabsList>

        {/* New Request Tab */}
        <TabsContent value="new-request" className="mt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Role Details */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="thco-section-label mb-6">Role Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Job Title *</Label>
                  <Input
                    placeholder="e.g., Senior Investment Associate"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 rounded-xl h-11"
                    {...register("job_title")}
                    data-testid="job-title-input"
                  />
                  {errors.job_title && <p className="text-red-500 text-sm">{errors.job_title.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Hiring Locations *</Label>
                  <Input
                    placeholder="e.g., Lagos, Nairobi, Remote"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 rounded-xl h-11"
                    {...register("hiring_locations")}
                    data-testid="hiring-locations-input"
                  />
                  {errors.hiring_locations && <p className="text-red-500 text-sm">{errors.hiring_locations.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-gray-700 font-medium">Job Description *</Label>
                  <Textarea
                    placeholder="Paste the full job description here"
                    rows={6}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 resize-none rounded-xl"
                    {...register("job_description")}
                    data-testid="job-description-input"
                  />
                  {errors.job_description && <p className="text-red-500 text-sm">{errors.job_description.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Salary Budget</Label>
                  <Input
                    placeholder="e.g., $80,000 - $120,000 USD"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 rounded-xl h-11"
                    {...register("salary_budget")}
                    data-testid="salary-budget-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Accept N-Minus-One Candidates *</Label>
                  <Select onValueChange={(value) => setValue("accept_n_minus_one", value)}>
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900 rounded-xl h-11" data-testid="n-minus-one-select">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 rounded-xl">
                      <SelectItem value="Yes — accept one level below with matching experience" className="text-gray-900 rounded-lg">
                        Yes — accept one level below
                      </SelectItem>
                      <SelectItem value="No — exact level only" className="text-gray-900 rounded-lg">
                        No — exact level only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.accept_n_minus_one && <p className="text-red-500 text-sm">{errors.accept_n_minus_one.message}</p>}
                </div>
              </div>
            </div>

            {/* Section 2: Hiring Company */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="thco-section-label mb-6">Hiring Company</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Company Name *</Label>
                  <Input
                    placeholder="e.g., Aruwa Capital"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 rounded-xl h-11"
                    {...register("company_name")}
                    data-testid="company-name-input"
                  />
                  {errors.company_name && <p className="text-red-500 text-sm">{errors.company_name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Company Website *</Label>
                  <Input
                    placeholder="e.g., https://aruwacapital.com"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 rounded-xl h-11"
                    {...register("company_website")}
                    data-testid="company-website-input"
                  />
                  {errors.company_website && <p className="text-red-500 text-sm">{errors.company_website.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Company Location *</Label>
                  <Input
                    placeholder="e.g., Lagos, Nigeria"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 rounded-xl h-11"
                    {...register("company_location")}
                    data-testid="company-location-input"
                  />
                  {errors.company_location && <p className="text-red-500 text-sm">{errors.company_location.message}</p>}
                </div>
              </div>
            </div>

            {/* Section 3: Targeting Preferences */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="thco-section-label mb-6">Targeting Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Target Companies to Hire From</Label>
                  <Textarea
                    placeholder="Companies to actively target. One per line or comma-separated."
                    rows={3}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 resize-none rounded-xl"
                    {...register("target_companies")}
                    data-testid="target-companies-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Companies to Exclude</Label>
                  <Textarea
                    placeholder="Companies we should NOT source from"
                    rows={3}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 resize-none rounded-xl"
                    {...register("companies_to_exclude")}
                    data-testid="exclude-companies-input"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-gray-700 font-medium">Industry Segments</Label>
                  <Textarea
                    placeholder="e.g., Include: private equity, venture capital. Exclude: commercial banking"
                    rows={2}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 resize-none rounded-xl"
                    {...register("industry_segments")}
                    data-testid="industry-segments-input"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Additional */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="thco-section-label mb-6">Additional</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Assigned Recruiter *</Label>
                  <Input
                    placeholder="Recruiter name"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 rounded-xl h-11"
                    {...register("assigned_recruiter")}
                    data-testid="assigned-recruiter-input"
                  />
                  {errors.assigned_recruiter && <p className="text-red-500 text-sm">{errors.assigned_recruiter.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Requester Email</Label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed rounded-xl h-11"
                    data-testid="requester-email-input"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-gray-700 font-medium">Additional Notes</Label>
                  <Textarea
                    placeholder="Any additional context or requirements"
                    rows={3}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 resize-none rounded-xl"
                    {...register("additional_notes")}
                    data-testid="additional-notes-input"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 font-medium rounded-xl shadow-sm hover:shadow-md transition-all"
                disabled={isLoading}
                data-testid="submit-sourcing-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-5 w-5" />
                    Launch AI Sourcing
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loadingHistory ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Loading history...</p>
              </div>
            ) : requests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 hover:bg-transparent">
                    <TableHead className="text-gray-500 font-mono text-xs uppercase">Date</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs uppercase">Job Title</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs uppercase">Company</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs uppercase">Location</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs uppercase">Recruiter</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs uppercase">Status</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs uppercase"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <>
                      <TableRow 
                        key={request.request_id} 
                        className="border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === request.request_id ? null : request.request_id)}
                        data-testid={`history-row-${request.request_id}`}
                      >
                        <TableCell className="text-gray-700">{formatDate(request.created_at)}</TableCell>
                        <TableCell className="text-gray-900 font-medium">{request.job_title}</TableCell>
                        <TableCell className="text-gray-600">{request.company_name}</TableCell>
                        <TableCell className="text-gray-600">{request.hiring_locations}</TableCell>
                        <TableCell className="text-gray-600">{request.assigned_recruiter}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {expandedRow === request.request_id ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRow === request.request_id && (
                        <TableRow className="border-gray-100 bg-gray-50">
                          <TableCell colSpan={7} className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400 block mb-1">Company Website</span>
                                <span className="text-gray-900">{request.company_website}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Company Location</span>
                                <span className="text-gray-900">{request.company_location}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Salary Budget</span>
                                <span className="text-gray-900">{request.salary_budget || "Not specified"}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">N-Minus-One</span>
                                <span className="text-gray-900">{request.accept_n_minus_one}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block mb-1">Requester</span>
                                <span className="text-gray-900">{request.requester_email}</span>
                              </div>
                              <div className="md:col-span-3">
                                <span className="text-gray-400 block mb-1">Job Description</span>
                                <span className="text-gray-900 whitespace-pre-wrap">{request.job_description}</span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No sourcing requests yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Back Link */}
      <Link 
        to="/talent" 
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
        data-testid="back-to-talent-link"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Talent & Delivery
      </Link>
    </div>
  );
};

export default SourcingTool;
