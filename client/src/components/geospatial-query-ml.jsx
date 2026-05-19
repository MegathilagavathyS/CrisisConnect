import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, MapPin, Globe, Building, Landmark, Brain } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function GeospatialQueryML() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const queryMutation = useMutation({
    mutationFn: async (text) => {
      const response = await apiRequest("POST", "/api/geospatial-query", { query: text });
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "ML-Enhanced Query Processed",
        description: `Found ${data.entityCount} geospatial entities using machine learning.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Query Failed",
        description: error.message || "Failed to process geospatial query",
        variant: "destructive",
      });
    },
  });

  const handleQuery = () => {
    if (!query.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a query to process.",
        variant: "destructive",
      });
      return;
    }
    queryMutation.mutate(query);
  };

  const getTableIcon = (table) => {
    switch (table) {
      case 'Country':
        return <Globe className="w-4 h-4" />;
      case 'State':
        return <Landmark className="w-4 h-4" />;
      case 'City':
        return <Building className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getTableColor = (table) => {
    switch (table) {
      case 'Country':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'State':
        return "bg-green-100 text-green-800 border-green-200";
      case 'City':
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return "bg-green-500 text-white";
    if (confidence >= 0.8) return "bg-yellow-500 text-white";
    if (confidence >= 0.7) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  const getMethodBadge = (method) => {
    const methodConfig = {
      'direct_match': { color: 'bg-green-100 text-green-800', label: 'Direct Match' },
      'ml_fuzzy_match': { color: 'bg-purple-100 text-purple-800', label: 'ML Fuzzy Match' },
      'pattern_match': { color: 'bg-blue-100 text-blue-800', label: 'Pattern Match' }
    };
    
    const config = methodConfig[method] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    return (
      <Badge className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-purple-600" />
          ML-Enhanced Geospatial Query System
        </h2>
        <p className="text-sm text-gray-600">
          Advanced entity recognition using machine learning, NLP, and multiple similarity algorithms.
        </p>
      </div>

      {/* Query Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enter Query</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[120px] resize-none"
              placeholder="Enter your natural language query here...

ML-Enhanced Examples:
• Which of the following saw the highest average temperature in January, Maharashtra, Ahmedabad or entire New-Zealand?
• Show me a graph of rainfall for Chennai for the month of October
• Compare population density between California, Texas and New York
• What's the weather like in Mumbai, Delhi and Bangalore?
• Analyze climate patterns in Tamil Nadu, Karnataka, and Andhra Pradesh regions"
            />
          </div>
          <Button 
            onClick={handleQuery}
            disabled={queryMutation.isPending}
            className="w-full"
          >
            {queryMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            {queryMutation.isPending ? "Processing with ML..." : "Analyze with ML"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>ML-Enhanced Results</span>
                <Badge variant="outline">
                  {result.entityCount} entities found
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 mb-2">
                <strong>Query:</strong> {result.query}
              </div>
            </CardContent>
          </Card>

          {/* Entity Details */}
          {result.entities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identified Entities (ML-Enhanced)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.entities.map((entity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded ${getTableColor(entity.table)}`}>
                          {getTableIcon(entity.table)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            "{entity.token}" → "{entity.canonicalName}"
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Table: {entity.table} | Method: {entity.method || 'direct_match'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {entity.method && getMethodBadge(entity.method)}
                        <Badge 
                          className={`text-xs px-2 py-1 rounded ${getConfidenceColor(entity.confidence)}`}
                        >
                          {Math.round(entity.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ML Analysis Details */}
          {result.entities.some(e => e.method === 'ml_fuzzy_match') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Brain className="w-4 h-4 mr-2 text-purple-600" />
                  Machine Learning Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>ML Techniques Used:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Bayesian Classification for entity filtering</li>
                    <li>Multi-algorithm fuzzy matching (Levenshtein + Jaccard + Cosine)</li>
                    <li>Feature-based entity recognition</li>
                    <li>Context-aware token analysis</li>
                    <li>Pattern-based place detection</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formatted Output */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formatted Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                {result.formattedOutput}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
