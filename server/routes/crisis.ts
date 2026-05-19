import { Router } from "express";
import { storage } from "../storage";
import { identifyGeospatialEntities, formatGeospatialOutput } from "../services/geospatial-query";

const router = Router();

// Location Extraction API
router.post("/extract-locations", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ message: "field 'text' is required and must be a string" });
    }

    // Use geospatial query service to extract locations
    const entities = identifyGeospatialEntities(text);
    
    // Convert to the format expected by the frontend
    const extractedLocations = entities.map(entity => ({
      original: entity.token,
      standardized: entity.canonicalName,
      confidence: entity.confidence,
      type: entity.table
    }));

    // Store the report
    const report = await storage.createReport({
      originalText: text,
      reportType: "disaster",
      severity: "medium"
    });

    // Update report with extracted locations
    await storage.updateReport(report.id, extractedLocations.map(loc => loc.standardized));

    // Create or update locations in storage
    for (const location of extractedLocations) {
      const existingLocation = await storage.getLocationByName(location.standardized);
      if (!existingLocation) {
        await storage.createLocation({
          originalText: location.original,
          standardizedName: location.standardized,
          confidence: location.confidence.toString(),
          country: "India" // Default, can be enhanced with geocoding
        });
      }
    }

    res.json({
      extractedLocations,
      reportId: report.id,
      entityCount: extractedLocations.length
    });
  } catch (error) {
    console.error("Location extraction error:", error);
    res.status(500).json({ message: "Failed to extract locations", error: String(error) });
  }
});

// Geospatial Query API
router.post("/geospatial-query", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "field 'query' is required and must be a string" });
    }

    const entities = identifyGeospatialEntities(query);
    const formattedOutput = formatGeospatialOutput(query);

    res.json({
      query,
      entities,
      formattedOutput,
      entityCount: entities.length
    });
  } catch (error) {
    console.error("Geospatial query error:", error);
    res.status(500).json({ message: "Failed to process geospatial query", error: String(error) });
  }
});

// Get all locations
router.get("/locations", async (req, res) => {
  try {
    const locations = await storage.getAllLocations();
    res.json(locations);
  } catch (error) {
    console.error("Get locations error:", error);
    res.status(500).json({ message: "Failed to fetch locations", error: String(error) });
  }
});

// Search locations
router.get("/locations/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ message: "query parameter 'q' is required" });
    }

    const locations = await storage.searchLocations(q);
    res.json(locations);
  } catch (error) {
    console.error("Search locations error:", error);
    res.status(500).json({ message: "Failed to search locations", error: String(error) });
  }
});

// Get all resources
router.get("/resources", async (req, res) => {
  try {
    const resources = await storage.getAllResources();
    res.json(resources);
  } catch (error) {
    console.error("Get resources error:", error);
    res.status(500).json({ message: "Failed to fetch resources", error: String(error) });
  }
});

// Get resources by location
router.get("/resources/location/:locationId", async (req, res) => {
  try {
    const { locationId } = req.params;
    const resources = await storage.getResourcesByLocation(locationId);
    res.json(resources);
  } catch (error) {
    console.error("Get resources by location error:", error);
    res.status(500).json({ message: "Failed to fetch resources for location", error: String(error) });
  }
});

// Dashboard Stats API with severity scoring
router.get("/dashboard/stats", async (req, res) => {
  try {
    const locations = await storage.getAllLocations();
    const resources = await storage.getAllResources();
    const reports = await storage.getAllReports();

    // Calculate resource statistics
    const resourceStats = {
      food: { total: 0, available: 0, critical: 0 },
      shelter: { total: 0, available: 0, critical: 0 },
      medical: { total: 0, available: 0, critical: 0 },
      water: { total: 0, available: 0, critical: 0 }
    };

    // Group resources by location and calculate severity
    const locationSeverity = new Map<string, { severity: string; shortagePercentage: number }>();

    resources.forEach(resource => {
      const type = resource.resourceType as keyof typeof resourceStats;
      if (resourceStats[type]) {
        resourceStats[type].total += resource.totalCapacity;
        resourceStats[type].available += resource.currentAvailable;
        
        if (resource.currentAvailable < resource.criticalThreshold) {
          resourceStats[type].critical += 1;
        }
      }

      // Calculate severity for each location
      const currentSeverity = locationSeverity.get(resource.locationId) || { severity: "stable", shortagePercentage: 0 };
      const shortagePercentage = ((resource.totalCapacity - resource.currentAvailable) / resource.totalCapacity) * 100;
      
      // Update severity based on shortage
      let newSeverity = currentSeverity.severity;
      if (shortagePercentage > 70) {
        newSeverity = "critical";
      } else if (shortagePercentage > 50) {
        newSeverity = "high";
      } else if (shortagePercentage > 30) {
        newSeverity = "medium";
      } else {
        newSeverity = "low";
      }

      // Use the highest severity across all resource types
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, stable: 0 };
      if (severityOrder[newSeverity as keyof typeof severityOrder] > severityOrder[currentSeverity.severity as keyof typeof severityOrder]) {
        locationSeverity.set(resource.locationId, { severity: newSeverity, shortagePercentage });
      }
    });

    // Count locations by severity
    let criticalAreas = 0;
    let warningAreas = 0;
    let stableAreas = 0;

    locationSeverity.forEach(({ severity }) => {
      if (severity === "critical" || severity === "high") {
        criticalAreas++;
      } else if (severity === "medium") {
        warningAreas++;
      } else {
        stableAreas++;
      }
    });

    const stats = {
      totalLocations: locations.length,
      totalReports: reports.length,
      criticalAreas,
      warningAreas,
      stableAreas,
      resourceStats,
      recentReports: reports.slice(-5).map(report => ({
        id: report.id,
        text: report.originalText.substring(0, 100),
        severity: report.severity,
        createdAt: report.createdAt
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats", error: String(error) });
  }
});

export default router;
