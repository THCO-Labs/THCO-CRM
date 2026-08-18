import { useState, useEffect } from "react";
import IconBadge from "../components/ui/icon-badge";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Database, Search, Loader2, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../components/ui/breadcrumb";
import { databaseSearchAPI } from "../lib/api";
import { toast } from "sonner";

const searchSchema = z.object({
  job_title: z.string().min(1, "Job title is required"),
  job_description: z.string().min(1, "Job description is required"),
  company_context: z.string().optional(),
  seniority_level: z.string().min(1, "Seniority level is required"),
  max_candidates: z.string().min(1, "Max candidates is required"),
});

const DatabaseSearchTool = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searches, setSearches] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(searchSchema),
  });

  useEffect(() => {
    const fetchSearches = async () => {
      try {
        const data = await databaseSearchAPI.getAll();
        setSearches(data);
      } catch (error) {
        console.error("Failed to fetch searches:", error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchSearches();
  }, []);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await databaseSearchAPI.create(data);
      toast.success("Database search initiated. Results will be delivered to your email shortly.");
      reset();
      const updatedSearches = await databaseSearchAPI.getAll();
      setSearches(updatedSearches);
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to submit search";
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
    <div className="space-y-6" data-testid="database-search-tool-page">
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
            <BreadcrumbPage className="text-gray-900 font-medium">Database Search</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Tool Header */}
      <div className="flex items-center gap-4">
        <IconBadge icon={Database} gradient="from-blue-500" size={48} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Search</h1>
          <p className="text-gray-500">Search our internal candidate database using AI-powered resume analysis</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="new-search" className="w-full">
        <TabsList className="bg-gray-100 border border-gray-200 p-1 rounded-xl">
          <TabsTrigger 
            value="new-search" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-lg"
            data-testid="new-search-tab"
          >
            New Search
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-lg"
            data-testid="search-history-tab"
          >
            Search History
          </TabsTrigger>
        </TabsList>

        {/* New Search Tab */}
        <TabsContent value="new-search" className="mt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Search Criteria Section */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="thco-section-label mb-6">Search Criteria</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Job Title *</Label>
                  <Input
                    placeholder="e.g., Senior Data Engineer"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 rounded-xl h-11"
                    {...register("job_title")}
                    data-testid="search-job-title-input"
                  />
                  {errors.job_title && <p className="text-red-500 text-sm">{errors.job_title.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Seniority Level *</Label>
                  <Select onValueChange={(value) => setValue("seniority_level", value)}>
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900 rounded-xl h-11" data-testid="seniority-level-select">
                      <SelectValue placeholder="Select seniority level" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 rounded-xl">
                      <SelectItem value="Junior (0-2 years)" className="text-gray-900 rounded-lg">Junior (0-2 years)</SelectItem>
                      <SelectItem value="Mid-Level (3-5 years)" className="text-gray-900 rounded-lg">Mid-Level (3-5 years)</SelectItem>
                      <SelectItem value="Senior (5-8 years)" className="text-gray-900 rounded-lg">Senior (5-8 years)</SelectItem>
                      <SelectItem value="Lead / Principal (8-12 years)" className="text-gray-900 rounded-lg">Lead / Principal (8-12 years)</SelectItem>
                      <SelectItem value="Executive / C-Suite (12+ years)" className="text-gray-900 rounded-lg">Executive / C-Suite (12+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.seniority_level && <p className="text-red-500 text-sm">{errors.seniority_level.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-gray-700 font-medium">Job Description *</Label>
                  <Textarea
                    placeholder="Paste the full JD here — responsibilities, requirements, qualifications..."
                    rows={6}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 resize-none rounded-xl"
                    {...register("job_description")}
                    data-testid="search-job-description-input"
                  />
                  {errors.job_description && <p className="text-red-500 text-sm">{errors.job_description.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Company / Hiring Context</Label>
                  <Textarea
                    placeholder="Industry, team size, culture, budget range, location requirements..."
                    rows={3}
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 resize-none rounded-xl"
                    {...register("company_context")}
                    data-testid="company-context-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Max Candidates to Evaluate *</Label>
                  <Select onValueChange={(value) => setValue("max_candidates", value)}>
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900 rounded-xl h-11" data-testid="max-candidates-select">
                      <SelectValue placeholder="Select max candidates" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 rounded-xl">
                      <SelectItem value="10 (Quick Scan)" className="text-gray-900 rounded-lg">10 (Quick Scan)</SelectItem>
                      <SelectItem value="25 (Standard)" className="text-gray-900 rounded-lg">25 (Standard)</SelectItem>
                      <SelectItem value="50 (Deep Search)" className="text-gray-900 rounded-lg">50 (Deep Search)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.max_candidates && <p className="text-red-500 text-sm">{errors.max_candidates.message}</p>}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 font-medium rounded-xl shadow-sm hover:shadow-md transition-all"
                disabled={isLoading}
                data-testid="submit-search-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Search Database
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
            ) : searches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 hover:bg-transparent">
                    <TableHead className="text-gray-500 font-mono text-xs uppercase">Date</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs uppercase">Job Title</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs uppercase">Seniority</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs uppercase">Max Candidates</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs uppercase">Status</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs uppercase"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searches.map((search) => (
                    <>
                      <TableRow 
                        key={search.search_id} 
                        className="border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === search.search_id ? null : search.search_id)}
                        data-testid={`search-history-row-${search.search_id}`}
                      >
                        <TableCell className="text-gray-700">{formatDate(search.created_at)}</TableCell>
                        <TableCell className="text-gray-900 font-medium">{search.job_title}</TableCell>
                        <TableCell className="text-gray-600">{search.seniority_level}</TableCell>
                        <TableCell className="text-gray-600">{search.max_candidates}</TableCell>
                        <TableCell>{getStatusBadge(search.status)}</TableCell>
                        <TableCell>
                          {expandedRow === search.search_id ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRow === search.search_id && (
                        <TableRow className="border-gray-100 bg-gray-50">
                          <TableCell colSpan={6} className="p-6">
                            <div className="space-y-4 text-sm">
                              <div>
                                <span className="text-gray-400 block mb-1">Job Description</span>
                                <span className="text-gray-900 whitespace-pre-wrap">{search.job_description}</span>
                              </div>
                              {search.company_context && (
                                <div>
                                  <span className="text-gray-400 block mb-1">Company / Hiring Context</span>
                                  <span className="text-gray-900">{search.company_context}</span>
                                </div>
                              )}
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
                <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No database searches yet</p>
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

export default DatabaseSearchTool;
