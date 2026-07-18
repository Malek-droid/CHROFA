'use strict';

/**
 * Central industry configuration with tier metadata.
 * Tier controls display order/grouping in onboarding wizard only.
 * All industries are fully available immediately - tier is not a feature gate.
 */

const INDUSTRIES = [
  // Tier 1
  { id: 'dentists', label: 'Dentists', tier: 1 },
  { id: 'medical_clinics', label: 'Medical Clinics', tier: 1 },
  { id: 'mental_health_therapists', label: 'Mental Health Therapists', tier: 1 },
  { id: 'hair_salons', label: 'Hair Salons', tier: 1 },
  { id: 'nail_salons', label: 'Nail Salons', tier: 1 },
  { id: 'spas', label: 'Spas', tier: 1 },
  
  // Tier 2
  { id: 'personal_trainers', label: 'Personal Trainers', tier: 2 },
  { id: 'nutritionists', label: 'Nutritionists', tier: 2 },
  { id: 'physiotherapists', label: 'Physiotherapists', tier: 2 },
  { id: 'chiropractors', label: 'Chiropractors', tier: 2 },
  
  // Tier 3
  { id: 'lawyers', label: 'Lawyers', tier: 3 },
  { id: 'architects', label: 'Architects', tier: 3 },
  { id: 'interior_designers', label: 'Interior Designers', tier: 3 },
  
  // Tier 4
  { id: 'veterinary_clinics', label: 'Veterinary Clinics', tier: 4 },
];

// Helper functions
function getIndustryIds() {
  return INDUSTRIES.map(i => i.id);
}

function getIndustryById(id) {
  return INDUSTRIES.find(i => i.id === id);
}

function getIndustriesByTier(tier) {
  return INDUSTRIES.filter(i => i.tier === tier);
}

function getAllTiers() {
  return [...new Set(INDUSTRIES.map(i => i.tier))].sort((a, b) => a - b);
}

module.exports = {
  INDUSTRIES,
  getIndustryIds,
  getIndustryById,
  getIndustriesByTier,
  getAllTiers,
};
