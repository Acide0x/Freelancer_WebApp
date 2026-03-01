/**
 * Format provider profile with maximum null-safety
 * @param {Object} provider - Raw provider from aggregation
 * @param {boolean} isOwner - Whether requester owns this profile
 * @returns {Object} Safe, frontend-ready provider object
 */
function formatProviderProfileSafe(provider, isOwner) {
  // Safe getter helper
  const get = (obj, path, defaultValue = null) => {
    try {
      const value = path.split('.').reduce((o, key) => o?.[key], obj);
      return value ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const pd = provider.providerDetails || {};

  return {
    _id: provider._id?.toString() || null,
    fullName: get(provider, 'fullName', 'Anonymous'),
    email: isOwner ? get(provider, 'email', null) : undefined, // hidden if not owner
    phone: isOwner ? get(provider, 'phone', null) : undefined,
    avatar: get(provider, 'avatar', null),
    bio: get(provider, 'bio', ''),
    role: get(provider, 'role', 'provider'),
    kycVerified: !!get(provider, 'kycVerified', false),
    
    location: {
      city: get(provider, 'location.city', null),
      state: get(provider, 'location.state', null),
      country: get(provider, 'location.country', 'Nepal'),
      coordinates: Array.isArray(get(provider, 'location.coordinates')) 
        ? get(provider, 'location.coordinates').slice(0, 2) 
        : null
    },

    providerDetails: {
      headline: get(pd, 'headline', ''),
      workDescription: get(pd, 'workDescription', ''),
      skills: Array.isArray(pd.skills) ? pd.skills.map(skill => ({
        name: skill?.name || skill || '',
        proficiency: skill?.proficiency || 'intermediate',
        years: skill?.years || null
      })) : [],
      certifications: Array.isArray(pd.certifications) ? pd.certifications : [],
      rate: pd.rate !== undefined && pd.rate !== null ? Number(pd.rate) : null,
      experienceYears: Number(pd.experienceYears) || 0,
      availabilityStatus: pd.availabilityStatus || 'unknown',
      isVerified: !!pd.isVerified,
      isProfilePublic: pd.isProfilePublic !== false,
      verificationStatus: pd.verificationStatus || 'unverified',
      profileCompletion: Number(pd.profileCompletion) || 0,
      portfolios: Array.isArray(pd.portfolios) ? pd.portfolios.map(p => ({
        _id: p?._id || null,
        title: p?.title || '',
        description: p?.description || '',
        images: Array.isArray(p?.images) ? p.images.slice(0, 10) : [],
        url: p?.url || null,
        createdAt: p?.createdAt || null
      })) : [],
      serviceAreas: Array.isArray(pd.serviceAreas) ? pd.serviceAreas.map(area => ({
        city: area?.city || '',
        radius: Number(area?.radius) || 5
      })) : []
    },

    ratings: {
      average: Number(provider.ratings?.average) || 0,
      count: Number(provider.ratings?.count) || 0,
      distribution: {
        "5": Number(provider.ratings?.distribution?.["5"]) || 0,
        "4": Number(provider.ratings?.distribution?.["4"]) || 0,
        "3": Number(provider.ratings?.distribution?.["3"]) || 0,
        "2": Number(provider.ratings?.distribution?.["2"]) || 0,
        "1": Number(provider.ratings?.distribution?.["1"]) || 0
      }
    },

    reviews: Array.isArray(provider.reviews) ? provider.reviews.map(r => ({
      _id: r?._id || null,
      reviewerId: r?.reviewerId || null,
      reviewerName: r?.reviewerName || 'Anonymous',
      reviewerAvatar: r?.reviewerAvatar || null,
      rating: Number(r?.rating) || 0,
      comment: r?.comment || '',
      date: r?.date || r?._id || null,
      createdAt: r?.createdAt || r?.date || null
    })) : [],

    createdAt: provider.createdAt || null,
    updatedAt: provider.updatedAt || provider.createdAt || null,
    isActive: !!provider.isActive
  };
}