
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
 * Supports standard UUIDs (which contain hyphens).
 * Example UUID: "tidalrave-369fc337-7496-48f5-8fa4-7f122b17ebad" -> "369fc337-7496-48f5-8fa4-7f122b17ebad"
 */
export const extractEventId = (slugParam: string | undefined): string => {
    if (!slugParam) return '';
    
    // Check for UUID at the end of the string (8-4-4-4-12 hex chars)
    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const match = slugParam.match(uuidRegex);
    
    if (match) {
        return match[0];
    }
    
    // Strict fallback: Split by hyphen and take the last part, assuming backend always provides ID at end.
    const parts = slugParam.split('-');
    return parts[parts.length - 1];
};
