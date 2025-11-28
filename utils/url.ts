
/**
 * Creates a URL-friendly slug combining the title and ID.
 * Example: "TidalRave Long Beach", "e1" -> "tidalrave-long-beach-e1"
 */
export const createEventSlug = (title: string, id: string): string => {
    if (!title) return id;
    
    const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
        
    return `${slug}-${id}`;
};

/**
 * Extracts the ID from a slug string.
 * Assumes the ID is the last segment separated by a hyphen.
 * Example: "tidalrave-long-beach-e1" -> "e1"
 */
export const extractEventId = (slugParam: string | undefined): string => {
    if (!slugParam) return '';
    
    // Split by hyphen and take the last part
    const parts = slugParam.split('-');
    return parts[parts.length - 1];
};
