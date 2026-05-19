import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import LocationExtractor from "@/components/location-extractor";
import GeospatialQueryML from "@/components/geospatial-query-ml";
import ResourceMap from "@/components/resource-map";
import ResourceCharts from "@/components/resource-charts";
import ResourceSummary from "@/components/resource-summary";
import Chatbot from "@/components/chatbot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Clock, RotateCcw, Search, Globe, Brain } from "lucide-react";
import { DashboardStats } from "@/lib/types";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stats, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const handleRefresh = () => {
    refetchStats();
    // You could also add a toast notification here
  };

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <MapPin className="text-primary text-2xl" />
              <h1 className="text-xl font-semibold text-gray-900">Crisis Resource Dashboard</h1>
            </div>
            <span className="bg-accent text-white px-3 py-1 rounded-full text-sm font-medium">Emergency Mode</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Last Update: {currentTime} UTC</span>
            </div>
            <Button onClick={handleRefresh} className="bg-primary text-white hover:bg-blue-700">
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Tabs for different functions */}
          <Tabs defaultValue="location-extraction" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-4">
              <TabsTrigger value="location-extraction" className="text-xs">
                <MapPin className="w-3 h-3 mr-1" />
                Extract
              </TabsTrigger>
              <TabsTrigger value="geospatial-query" className="text-xs">
                <Brain className="w-3 h-3 mr-1" />
                ML Query
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="location-extraction" className="flex-1 mt-0">
              <LocationExtractor />
            </TabsContent>
            
            <TabsContent value="geospatial-query" className="flex-1 mt-0">
              <GeospatialQueryML />
            </TabsContent>
          </Tabs>

          {/* Quick Search */}
          <div className="p-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Search</h2>
            <div className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                placeholder="Search locations..."
              />
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          {/* Resource Summary */}
          <div className="p-6 border-t border-gray-200">
            <ResourceSummary stats={stats} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 flex">
            {/* Map Section */}
            <ResourceMap searchQuery={searchQuery} />

            {/* Charts Panel */}
            <ResourceCharts />
          </div>
        </main>
      </div>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}
