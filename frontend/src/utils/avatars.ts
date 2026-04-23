/**
 * Returns initials from a full name (e.g., "Cynthia Zabala" -> "CZ")
 */
export const getInitials = (fullName?: string) => {
  if (!fullName) return "?";
  
  const names = fullName.trim().split(/\s+/);
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

export const DEFAULT_AVATARS = {
  MALE: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400",
  FEMALE: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400",
  GENERIC: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400"
};

export const getDefaultAvatar = (fullName?: string) => {
  // Keep this for now just in case, but initials are preferred
  if (!fullName) return DEFAULT_AVATARS.GENERIC;
  
  const femaleNames = [
    'maria', 'ana', 'martha', 'laura', 'sofia', 'elena', 'isabel', 'estudiante', 
    'claudia', 'paola', 'cynthia', 'cintia', 'lucia', 'valeria', 'gabriela'
  ];
  const nameLower = fullName.toLowerCase();
  
  if (femaleNames.some(name => nameLower.includes(name))) {
    return DEFAULT_AVATARS.FEMALE;
  }
  
  return DEFAULT_AVATARS.MALE;
};
