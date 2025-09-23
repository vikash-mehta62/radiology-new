const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// In-memory audit storage (in production, use a database)
let auditEvents = [];

// Create a new audit event
router.post('/', async (req, res) => {
  try {
    const {
      event_type,
      event_description,
      resource_type,
      resource_id,
      study_uid,
      report_id,
      patient_id,
      metadata,
      timestamp,
      ip_address
    } = req.body;

    // Validate required fields
    if (!event_type || !event_description || !resource_type || !resource_id) {
      return res.status(400).json({
        success: false,
        error: 'event_type, event_description, resource_type, and resource_id are required'
      });
    }

    // Create audit event
    const auditEvent = {
      id: uuidv4(),
      event_type,
      event_description,
      user_id: req.user?.id || 'system', // In production, get from auth middleware
      user_role: req.user?.role || 'radiologist',
      resource_type,
      resource_id,
      study_uid,
      report_id,
      patient_id,
      ip_address: ip_address || req.ip || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
      metadata: metadata || {}
    };

    // Store audit event
    auditEvents.push(auditEvent);

    console.log(`📝 Audit event logged: ${event_type} for ${resource_type} ${resource_id}`);

    res.json({
      success: true,
      ...auditEvent
    });

  } catch (error) {
    console.error('❌ Error creating audit event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create audit event',
      message: error.message
    });
  }
});

// Get audit events with filtering
router.get('/', async (req, res) => {
  try {
    const {
      event_type,
      resource_type,
      user_id,
      start_date,
      end_date,
      limit = 50,
      skip = 0
    } = req.query;

    let filteredEvents = [...auditEvents];

    // Apply filters
    if (event_type) {
      filteredEvents = filteredEvents.filter(event => event.event_type === event_type);
    }

    if (resource_type) {
      filteredEvents = filteredEvents.filter(event => event.resource_type === resource_type);
    }

    if (user_id) {
      filteredEvents = filteredEvents.filter(event => event.user_id === user_id);
    }

    if (start_date) {
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.timestamp) >= new Date(start_date)
      );
    }

    if (end_date) {
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.timestamp) <= new Date(end_date)
      );
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const total = filteredEvents.length;
    const paginatedEvents = filteredEvents.slice(
      parseInt(skip),
      parseInt(skip) + parseInt(limit)
    );

    res.json({
      success: true,
      events: paginatedEvents,
      total,
      skip: parseInt(skip),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('❌ Error getting audit events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audit events',
      message: error.message
    });
  }
});

// Get audit trail for a specific report
router.get('/report/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    const reportEvents = auditEvents.filter(event => 
      event.report_id === reportId || event.resource_id === reportId
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
      success: true,
      events: reportEvents
    });

  } catch (error) {
    console.error('❌ Error getting report audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get report audit trail',
      message: error.message
    });
  }
});

// Get audit trail for a specific study
router.get('/study/:studyUid', async (req, res) => {
  try {
    const { studyUid } = req.params;

    const studyEvents = auditEvents.filter(event => 
      event.study_uid === studyUid
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
      success: true,
      events: studyEvents
    });

  } catch (error) {
    console.error('❌ Error getting study audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get study audit trail',
      message: error.message
    });
  }
});

// Get audit trail for a specific patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    const patientEvents = auditEvents.filter(event => 
      event.patient_id === patientId
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
      success: true,
      events: patientEvents
    });

  } catch (error) {
    console.error('❌ Error getting patient audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get patient audit trail',
      message: error.message
    });
  }
});

// Get audit statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      total_events: auditEvents.length,
      events_by_type: {},
      events_by_resource_type: {},
      events_by_user: {},
      recent_activity: auditEvents
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
    };

    // Count events by type
    auditEvents.forEach(event => {
      stats.events_by_type[event.event_type] = 
        (stats.events_by_type[event.event_type] || 0) + 1;
      
      stats.events_by_resource_type[event.resource_type] = 
        (stats.events_by_resource_type[event.resource_type] || 0) + 1;
      
      stats.events_by_user[event.user_id] = 
        (stats.events_by_user[event.user_id] || 0) + 1;
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error getting audit statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audit statistics',
      message: error.message
    });
  }
});

// Delete old audit events (cleanup)
router.delete('/cleanup', async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const initialCount = auditEvents.length;
    auditEvents = auditEvents.filter(event => 
      new Date(event.timestamp) > cutoffDate
    );
    const deletedCount = initialCount - auditEvents.length;

    console.log(`🧹 Cleaned up ${deletedCount} audit events older than ${days} days`);

    res.json({
      success: true,
      deleted_count: deletedCount,
      remaining_count: auditEvents.length
    });

  } catch (error) {
    console.error('❌ Error cleaning up audit events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup audit events',
      message: error.message
    });
  }
});

module.exports = router;