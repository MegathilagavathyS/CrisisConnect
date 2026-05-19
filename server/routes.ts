import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReportSchema, insertLocationSchema, insertChatMessageSchema } from "@shared/schema";
import { extractLocationsFromText, getLocationCoordinates, calculateResourceSeverity } from "./services/nlp";
import { cohereService } from "./services/cohere";
const { identifyGeospatialEntities, formatGeospatialOutput } = require("./services/geospatial-query-ml");

export async function registerRoutes(app: Express): Promise<Server> {
  // Location extraction endpoint
  app.post("/api/extract-locations", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text input is required" });
      }

      // Create a report
      const report = await storage.createReport({
        originalText: text,
        reportType: "disaster",
        severity: "medium"
      });

      // Extract locations using NLP
      const extractedLocations = extractLocationsFromText(text);
      const locationIds: string[] = [];

      // Process each extracted location
      for (const extracted of extractedLocations) {
        // Check if location already exists
        let location = await storage.getLocationByName(extracted.standardized);
        
        if (!location) {
          // Create new location
          const coordinates = getLocationCoordinates(extracted.standardized);
          location = await storage.createLocation({
            originalText: extracted.original,
            standardizedName: extracted.standardized,
            state: extracted.state,
            country: "India",
            latitude: coordinates ? coordinates.latitude.toString() : null,
            longitude: coordinates ? coordinates.longitude.toString() : null,
            confidence: extracted.confidence.toString()
          });
        }
        
        locationIds.push(location.id);
      }

      // Update report with extracted location IDs
      await storage.updateReport(report.id, locationIds);

      res.json({
        reportId: report.id,
        extractedLocations: extractedLocations.map((loc, index) => ({
          ...loc,
          locationId: locationIds[index]
        }))
      });
    } catch (error) {
      console.error("Location extraction error:", error);
      res.status(500).json({ message: "Failed to extract locations" });
    }
  });

  // Geospatial query endpoint
  app.post("/api/geospatial-query", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query text is required" });
      }

      // Identify geospatial entities
      const entities = identifyGeospatialEntities(query);
      
      res.json({
        query,
        entities,
        formattedOutput: formatGeospatialOutput(query),
        entityCount: entities.length
      });
    } catch (error) {
      console.error("Geospatial query error:", error);
      res.status(500).json({ message: "Failed to process geospatial query" });
    }
  });

  // Get all locations
  app.get("/api/locations", async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Search locations
  app.get("/api/locations/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }

      const locations = await storage.searchLocations(q);
      res.json(locations);
    } catch (error) {
      console.error("Error searching locations:", error);
      res.status(500).json({ message: "Failed to search locations" });
    }
  });

  // Get all resources
  app.get("/api/resources", async (req, res) => {
    try {
      const resources = await storage.getAllResources();
      const locations = await storage.getAllLocations();
      
      // Group resources by location
      const resourcesByLocation = resources.reduce((acc, resource) => {
        const location = locations.find(loc => loc.id === resource.locationId);
        if (location) {
          if (!acc[location.id]) {
            acc[location.id] = {
              location,
              resources: [],
              severity: "stable"
            };
          }
          acc[location.id].resources.push(resource);
        }
        return acc;
      }, {} as Record<string, any>);

      // Calculate severity for each location
      Object.values(resourcesByLocation).forEach((locationData: any) => {
        locationData.severity = calculateResourceSeverity(locationData.resources);
      });

      res.json(Object.values(resourcesByLocation));
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // Get resources by location
  app.get("/api/locations/:locationId/resources", async (req, res) => {
    try {
      const { locationId } = req.params;
      const resources = await storage.getResourcesByLocation(locationId);
      const location = await storage.getLocation(locationId);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      const severity = calculateResourceSeverity(resources);
      
      res.json({
        location,
        resources,
        severity
      });
    } catch (error) {
      console.error("Error fetching location resources:", error);
      res.status(500).json({ message: "Failed to fetch location resources" });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Save user message
      await storage.createChatMessage({
        sessionId,
        message,
        isUser: true
      });

      // Get context for the AI
      const locations = await storage.getAllLocations();
      const resources = await storage.getAllResources();
      const reports = await storage.getAllReports();

      // Build context for Cohere
      const context = {
        locations: locations.map(loc => ({
          name: loc.standardizedName,
          resources: resources.filter(r => r.locationId === loc.id)
        })),
        recentReports: reports.slice(-5).map(r => ({
          text: r.originalText,
          severity: r.severity
        }))
      };

      // Generate AI response
      const aiResponse = await cohereService.generateResponse(message, context);

      // Save AI response
      await storage.createChatMessage({
        sessionId,
        message: aiResponse,
        isUser: false
      });

      // Extract intent for potential actions
      const intent = await cohereService.extractIntent(message);

      res.json({
        response: aiResponse,
        intent,
        sessionId
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Get chat history
  app.get("/api/chat/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // Get dashboard statistics
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const resources = await storage.getAllResources();
      const locations = await storage.getAllLocations();
      
      const stats = {
        totalLocations: locations.length,
        criticalAreas: 0,
        warningAreas: 0,
        stableAreas: 0,
        resourceStats: {
          food: { total: 0, available: 0, critical: 0 },
          shelter: { total: 0, available: 0, critical: 0 },
          medical: { total: 0, available: 0, critical: 0 },
          water: { total: 0, available: 0, critical: 0 }
        }
      };

      // Calculate statistics
      const resourcesByLocation = resources.reduce((acc, resource) => {
        if (!acc[resource.locationId]) {
          acc[resource.locationId] = [];
        }
        acc[resource.locationId].push(resource);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate area severities
      Object.values(resourcesByLocation).forEach((locationResources: any[]) => {
        const severity = calculateResourceSeverity(locationResources);
        switch (severity) {
          case 'critical': stats.criticalAreas++; break;
          case 'warning': stats.warningAreas++; break;
          case 'stable': stats.stableAreas++; break;
        }
      });

      // Calculate resource statistics
      resources.forEach(resource => {
        const type = resource.resourceType as keyof typeof stats.resourceStats;
        if (stats.resourceStats[type]) {
          stats.resourceStats[type].total += resource.totalCapacity;
          stats.resourceStats[type].available += resource.currentAvailable;
          if (resource.currentAvailable <= resource.criticalThreshold) {
            stats.resourceStats[type].critical++;
          }
        }
      });

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
