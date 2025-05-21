/**
 * Title Queue System
 * 
 * This module manages the assignment title queues with the following features:
 * - Maintains separate queues for three assignment types
 * - Implements Fisher-Yates shuffle for randomization
 * - Manages round-robin selection between assignment types
 * - Persists state in localStorage between sessions
 */

// Assignment types
const ASSIGNMENT_TYPES = ['story', 'essay', 'paragraph'];

// localStorage keys
const STORAGE_KEY_QUEUES = 'titleQueues';
const STORAGE_KEY_INDEX = 'roundRobinIndex';

/**
 * Initialize title queues with the provided lists
 * @param {Object} lists - Object containing arrays of titles for each assignment type
 */
export function initTitleQueues(lists) {
    let queues = null;
    let roundRobinIndex = 0;
    
    // Try to load existing queues from localStorage
    try {
        const savedQueues = localStorage.getItem(STORAGE_KEY_QUEUES);
        const savedIndex = localStorage.getItem(STORAGE_KEY_INDEX);
        
        if (savedQueues && savedIndex) {
            queues = JSON.parse(savedQueues);
            roundRobinIndex = parseInt(savedIndex, 10);
            
            // Validate loaded queues
            const isValid = ASSIGNMENT_TYPES.every(type => 
                Array.isArray(queues[type]) && queues[type].length > 0
            );
            
            if (!isValid) {
                console.log("Stored queues invalid, reinitializing...");
                queues = null;
            }
        }
    } catch (error) {
        console.error("Error loading queues from localStorage:", error);
    }
    
    // Initialize new queues if needed
    if (!queues) {
        queues = {};
        
        // For each assignment type, create a shuffled queue
        ASSIGNMENT_TYPES.forEach(type => {
            if (!lists[type] || !Array.isArray(lists[type]) || lists[type].length === 0) {
                console.error(`No valid titles provided for ${type}`);
                queues[type] = ["Default Title"];
                return;
            }
            
            // Create a copy of the list and shuffle it
            queues[type] = [...lists[type]];
            shuffleArray(queues[type]);
        });
        
        // Reset round robin index
        roundRobinIndex = 0;
        
        // Save to localStorage
        saveToLocalStorage(queues, roundRobinIndex);
    }
}

/**
 * Get the next assignment based on round-robin selection
 * @returns {Object} Object containing type and title of the next assignment
 */
export function getNextAssignment() {
    // Load current state from localStorage
    let queues = JSON.parse(localStorage.getItem(STORAGE_KEY_QUEUES));
    let roundRobinIndex = parseInt(localStorage.getItem(STORAGE_KEY_INDEX), 10);
    
    if (!queues || isNaN(roundRobinIndex)) {
        console.error("Queue data not found in localStorage");
        return { type: 'story', title: 'Default Title' };
    }
    
    // Get the current assignment type based on round-robin index
    const type = ASSIGNMENT_TYPES[roundRobinIndex];
    
    // Get the next title from the current queue
    const title = queues[type].shift();
    
    // Check if we've exhausted this queue
    if (queues[type].length === 0) {
        console.log(`Queue for ${type} is empty, refilling...`);
        // Reinitialize this queue with the original list
        const originalLists = getOriginalLists();
        if (originalLists[type]) {
            queues[type] = [...originalLists[type]];
            shuffleArray(queues[type]);
        } else {
            // Fallback if original lists not available
            queues[type] = ["Default Title"];
        }
    }
    
    // Move to the next assignment type in the round-robin
    roundRobinIndex = (roundRobinIndex + 1) % ASSIGNMENT_TYPES.length;
    
    // Check if we've completed a full cycle through all types
    const allEmpty = ASSIGNMENT_TYPES.every(type => queues[type].length === 0);
    if (allEmpty) {
        console.log("All queues emptied, resetting...");
        // This will trigger a full reset on next initTitleQueues call
        localStorage.removeItem(STORAGE_KEY_QUEUES);
        localStorage.removeItem(STORAGE_KEY_INDEX);
    } else {
        // Save updated state to localStorage
        saveToLocalStorage(queues, roundRobinIndex);
    }
    
    return { type, title };
}

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array - Array to shuffle in-place
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Save queues and round-robin index to localStorage
 * @param {Object} queues - Object containing title queues
 * @param {number} index - Current round-robin index
 */
function saveToLocalStorage(queues, index) {
    try {
        localStorage.setItem(STORAGE_KEY_QUEUES, JSON.stringify(queues));
        localStorage.setItem(STORAGE_KEY_INDEX, index.toString());
    } catch (error) {
        console.error("Error saving to localStorage:", error);
    }
}

/**
 * Get the original lists of titles
 * This is a placeholder - in a real implementation, you would either:
 * 1. Store the original lists separately in localStorage during init
 * 2. Re-fetch them from a global variable or data source
 * @returns {Object} Original lists of titles
 */
function getOriginalLists() {
    // In a real implementation, you would return the original lists
    // For now, just checking if they're defined in the global scope
    if (typeof window.STORY_TITLES !== 'undefined' &&
        typeof window.ESSAY_TITLES !== 'undefined' &&
        typeof window.PARA_TITLES !== 'undefined') {
        return {
            story: window.STORY_TITLES,
            essay: window.ESSAY_TITLES,
            paragraph: window.PARA_TITLES
        };
    }
    
    // Fallback if not found
    console.warn("Original title lists not found in global scope");
    return {
        story: [],
        essay: [],
        paragraph: []
    };
} 