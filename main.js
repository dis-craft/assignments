// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCQplDmgPyEYy9CGu99mpu--_7wB71WVXI",
    authDomain: "srikar-m-projects.firebaseapp.com",
    databaseURL: "https://srikar-m-projects-default-rtdb.firebaseio.com",
    projectId: "srikar-m-projects",
    storageBucket: "srikar-m-projects.firebasestorage.app",
    messagingSenderId: "139896255553",
    appId: "1:139896255553:web:f29b96807041ae606f02c0",
    measurementId: "G-HVMYNCRH2T"
  };

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    
    // Initialize Firebase Analytics
    if (firebase.analytics) {
        var analytics = firebase.analytics();
        console.log("Firebase Analytics initialized successfully");
    }
    
    // Initialize Firebase Realtime Database (RTDB)
    var rtdb = firebase.database();
    console.log("Firebase RTDB initialized successfully");
    
    // Create a dummy Firestore object to avoid errors
    var db = {
        collection: () => ({
            add: (data) => {
                console.log("Firestore write prevented, using RTDB instead");
                // Generate a unique ID that would have come from Firestore
                const uniqueId = 'user_' + new Date().getTime();
                // Log to RTDB instead
                rtdb.ref('users/' + uniqueId).set({
                    ...data,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                return Promise.resolve({ id: uniqueId });
            },
            doc: (id) => ({
                update: (data) => {
                    console.log("Firestore update prevented, using RTDB instead");
                    return rtdb.ref('users/' + id).update(data);
                }
            })
        })
    };
} catch (error) {
    console.error("Error initializing Firebase:", error);
    // Create dummy objects to prevent errors if Firebase fails
    var db = {
        collection: () => ({
            add: () => Promise.resolve({ id: 'dummy-id' }),
            doc: () => ({
                update: () => Promise.resolve()
            })
        })
    };
    var rtdb = null;
}

// Gemini API Configuration
const GEMINI_API_KEY = "AIzaSyBUKaDyUPgWBBY9o1GqfIYZ8Bx9zadsGZE";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// DOM Elements
const welcomeSection = document.getElementById('welcome-section');
const mainSection = document.getElementById('main-section');
const startBtn = document.getElementById('start-btn');
const userNameInput = document.getElementById('user-name');
const subjectSelect = document.getElementById('subject-select');
const userNameDisplay = document.getElementById('user-name-display');
const generateBtn = document.getElementById('generate-btn');
const resultsSection = document.getElementById('results-section');
const loader = document.getElementById('loader');
const toastContainer = document.getElementById('toast-container');

// Additional DOM Elements for new features
const aiBadge = document.getElementById('ai-badge');
const userBadgeName = document.getElementById('user-badge-name');
const linkedinPopup = document.getElementById('linkedin-popup');

// Constants for LinkedIn popup timing
const LINKEDIN_POPUP_DELAY = 3000; // 3 seconds after generation
const LINKEDIN_POPUP_DURATION = 8000; // Show for 8 seconds
const LINKEDIN_POPUP_INTERVAL = 15 * 60 * 1000; // Show again after 15 minutes

// Global variable to track if we should show the LinkedIn popup
let lastLinkedinPopupTime = parseInt(localStorage.getItem('lastLinkedinPopupTime') || '0');

// Global variables
let userInfo = {
    name: '',
    subject: '',
    browser: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: formatTimestamp(),
    generations: [],
    linkedinClicks: 0
};

// New global variables for assignment notifications
let lastGenerationTimestamp = Date.now();
let recentGenerationsListener = null;

// Helper function to format date in dd:MM:yyyy, hh:mm:ss (12-hour clock)
function formatTimestamp(date = new Date()) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}:${month}:${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
}

// Generate or retrieve persistent user ID
function getUserId() {
    let userId = localStorage.getItem('persistentUserId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('persistentUserId', userId);
    }
    return userId;
}

// Show AI badge with the user's name
function showAiBadge() {
    if (aiBadge && userBadgeName) {
        userBadgeName.textContent = userInfo.name || 'you';
        aiBadge.classList.remove('hidden');
        
        // Automatically hide badge after 5 seconds
        setTimeout(() => {
            hideAiBadge();
        }, 5000);
    }
}

// Hide AI badge
function hideAiBadge() {
    if (aiBadge) {
        aiBadge.classList.add('hidden');
    }
}

// Show LinkedIn popup
function showLinkedinPopup() {
    if (linkedinPopup && userInfo.name) {
        // Only show if enough time has passed since last showing
        const currentTime = Date.now();
        if (currentTime - lastLinkedinPopupTime > LINKEDIN_POPUP_INTERVAL) {
            linkedinPopup.classList.remove('hidden');
            
            // Schedule hiding the popup
            setTimeout(() => {
                linkedinPopup.classList.add('hidden');
            }, LINKEDIN_POPUP_DURATION);
            
            // Update the last shown time
            lastLinkedinPopupTime = currentTime;
            localStorage.setItem('lastLinkedinPopupTime', currentTime.toString());
        }
    }
}

// Make the LinkedIn link more interactive
document.addEventListener('DOMContentLoaded', function() {
    const linkedinLink = document.querySelector('.footer a');
    if (linkedinLink) {
        // Add click tracking
        linkedinLink.addEventListener('click', logLinkedinClick);
        
        // Make the popup have pointer events when hovering over the footer
        linkedinLink.addEventListener('mouseenter', function() {
            if (linkedinPopup) {
                linkedinPopup.style.pointerEvents = 'auto';
                // Show the popup when hovering if user has entered their name
                if (userInfo.name) {
                    showLinkedinPopup();
                }
            }
        });
        
        linkedinLink.addEventListener('mouseleave', function() {
            if (linkedinPopup) {
                linkedinPopup.style.pointerEvents = 'none';
            }
        });
    } else {
        console.warn("LinkedIn link not found in the DOM");
    }
    
    // Add event listener for AI badge close button
    const aiBadgeCloseBtn = document.getElementById('ai-badge-close');
    if (aiBadgeCloseBtn) {
        aiBadgeCloseBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            hideAiBadge();
        });
        console.log("AI badge close button event listener added");
    } else {
        console.warn("AI badge close button not found in the DOM");
    }
});

// Assignment Checkboxes
const assignment1Checkbox = document.getElementById('assignment1');
const assignment2Checkbox = document.getElementById('assignment2');
const assignment3Checkbox = document.getElementById('assignment3');

// Event Listeners
if (startBtn) {
    startBtn.addEventListener('click', function(event) {
        console.log("Start button clicked");
        handleStart();
    });
    console.log("Start button event listener added");
} else {
    console.error("Start button not found in the DOM");
}

if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerate);
    console.log("Generate button event listener added");
} else {
    console.warn("Generate button not found in the DOM");
}

// Import title modules
import { STORY_TITLES, ESSAY_TITLES, PARA_TITLES } from './titles.js';
import { initTitleQueues } from './titleQueue.js';

// Initialize title queues
document.addEventListener('DOMContentLoaded', function() {
    // Initialize title queues
    initTitleQueues({
        story: STORY_TITLES,
        essay: ESSAY_TITLES,
        paragraph: PARA_TITLES
    });
    
    console.log("Title queues initialized");
});

// Function to get a title for a specific assignment type from the queue
function getTitleForAssignmentType(type) {
    // Load current state from localStorage
    let queues = JSON.parse(localStorage.getItem('titleQueues'));
    
    if (!queues) {
        console.error("Queue data not found in localStorage");
        return "Default Title";
    }
    
    // Get the next title from the requested type's queue
    if (!queues[type] || queues[type].length === 0) {
        // Reinitialize this queue with the original list if empty
        const originalLists = {
            story: STORY_TITLES,
            essay: ESSAY_TITLES,
            paragraph: PARA_TITLES
        };
        
        if (originalLists[type]) {
            queues[type] = [...originalLists[type]];
            shuffleArray(queues[type]);
            console.log(`Queue for ${type} was empty, refilled and shuffled`);
        } else {
            queues[type] = ["Default Title"];
            console.warn(`No original titles found for ${type}, using default`);
        }
    }
    
    // Get and remove the first title from the queue
    const title = queues[type].shift();
    
    // Save the updated queues back to localStorage
    localStorage.setItem('titleQueues', JSON.stringify(queues));
    
    return title;
}

// Fisher-Yates shuffle function (duplicated from titleQueue.js for convenience)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Functions
async function handleStart() {
    console.log("handleStart function called");
    
    if (!userNameInput) {
        console.error("User name input element not found");
        return;
    }
    
    if (!subjectSelect) {
        console.error("Subject select element not found");
        return;
    }
    
    const name = userNameInput.value.trim();
    const subject = subjectSelect.value;
    
    console.log("User entered name:", name);
    console.log("User selected subject:", subject);
    
    if (!name) {
        showToast('Please enter your name', 'error');
        return;
    }
    
    if (!subject) {
        showToast('Please select a subject', 'error');
        return;
    }
    
    userInfo.name = name;
    userInfo.subject = subject;
    
    // Make sure we have a persisted user ID
    userInfo.userId = getUserId();
    
    if (userNameDisplay) {
        userNameDisplay.textContent = `Welcome, ${userInfo.name}! (${userInfo.subject})`;
    } else {
        console.warn("User name display element not found");
    }
    
    try {
        // Log user visit to Firebase and wait for it to complete
        console.log("Attempting to log user visit");
        await logUserVisit();
        console.log("User visit logged successfully");
        
        // Show main section after logging is complete
        console.log("Showing main section");
        if (welcomeSection && mainSection) {
            welcomeSection.classList.add('hidden');
            mainSection.classList.remove('hidden');
            console.log("Main section should now be visible");
            
            // Initialize the recent generations display
            updateRecentGenerationsDisplay();
            
            // Schedule the LinkedIn popup after a delay
            setTimeout(() => {
                showLinkedinPopup();
            }, LINKEDIN_POPUP_DELAY);
        } else {
            console.error("Welcome or main section not found");
            throw new Error("DOM elements not found");
        }
    } catch (error) {
        console.error('Error in handleStart:', error);
        
        // Still proceed with the app even if logging fails
        if (welcomeSection && mainSection) {
            console.log("Showing main section despite error");
            welcomeSection.classList.add('hidden');
            mainSection.classList.remove('hidden');
        } else {
            console.error("Critical error: Cannot show main section, DOM elements not found");
            showToast('An error occurred. Please refresh the page and try again.', 'error');
        }
    }
}

async function handleGenerate() {
    console.log("handleGenerate function called");
    
    // Check if at least one assignment is selected
    if (!assignment1Checkbox.checked && !assignment2Checkbox.checked && !assignment3Checkbox.checked) {
        showToast('Please select at least one assignment', 'error');
        return;
    }
    
    // Show loader
    if (generateBtn && loader) {
        generateBtn.classList.add('hidden');
        loader.classList.remove('hidden');
    } else {
        console.warn("Generate button or loader not found");
    }
    
    // Clear previous results
    if (resultsSection) {
        resultsSection.innerHTML = '';
    } else {
        console.warn("Results section not found");
    }
    
    // Generate selected assignments
    const selectedAssignments = [];
    
    if (assignment1Checkbox && assignment1Checkbox.checked) {
        const title = getTitleForAssignmentType('story');
        selectedAssignments.push(generateAssignment1(title));
    }
    
    if (assignment2Checkbox && assignment2Checkbox.checked) {
        const title = getTitleForAssignmentType('essay');
        selectedAssignments.push(generateAssignment2(title));
    }
    
    if (assignment3Checkbox && assignment3Checkbox.checked) {
        const title = getTitleForAssignmentType('paragraph');
        selectedAssignments.push(generateAssignment3(title));
    }
    
    try {
        const results = await Promise.all(selectedAssignments);
        results.forEach(displayResult);
        
        // Show generation toast
        showToast(`${userInfo.name || 'User'} just generated their assignments!`, 'success');
        
        // Show the AI badge
        showAiBadge();
        
        // Show LinkedIn popup after a delay
        setTimeout(() => {
            showLinkedinPopup();
        }, LINKEDIN_POPUP_DELAY);
        
        // Show feedback form
        showFeedbackForm();
        
        // Log generation to Firebase
        await logGeneration(results);
    } catch (error) {
        console.error('Error generating assignments:', error);
        showToast(`Error generating assignments. Please try again.`, 'error');
    } finally {
        // Hide loader and show generate button
        if (loader && generateBtn) {
            loader.classList.add('hidden');
            generateBtn.classList.remove('hidden');
        }
    }
}

async function generateAssignment1(title) {
    const prompt = `Write a unique story about "${title}" using all categories of Present tense (simple present, present continuous, present perfect, and present perfect continuous). 

The story should be exactly 275 words, creative, engaging, and clearly demonstrate each tense category. Include at least one example of each tense category. Each sentence should use a different present tense category where possible.

IMPORTANT: 
1. Start with the title "${title}" on the first line.
2. Format your response with the title on the first line, then a blank line, followed by the 275-word story.
3. DO NOT use any specific names in the story.
4. Make the content highly relevant to the title.

Example format:
${title}

Story content begins...`;
    
    const response = await callGeminiAPI(prompt);
    
    return {
        title: 'Present Tense Story',
        content: response,
        type: 'assignment1',
        icon: 'fa-book'
    };
}

async function generateAssignment2(title) {
    const prompt = `Write a unique, plagiarism-proof essay about "${title}". 

The essay should be exactly 275 words, formal and professional in tone, with clear paragraphs and a logical structure. Include an introduction with a thesis statement, body paragraphs with supporting evidence and examples, and a conclusion. Address how this topic relates to communication skills in the digital age.

IMPORTANT:
1. Start with the title "${title}" on the first line.
2. Format your response with the title on the first line, then a blank line, followed by the 275-word essay.
3. DO NOT include or reference any specific person's name in the essay.
4. Make the content directly address the title topic.

Example format:
${title}

Essay content begins...`;
    
    const response = await callGeminiAPI(prompt);
    
    return {
        title: 'Communication Skills Essay',
        content: response,
        type: 'assignment2',
        icon: 'fa-comments'
    };
}

async function generateAssignment3(title) {
    const prompt = `Write a concise, unique paragraph about "${title}".

The paragraph should be exactly 275 words, informative, professional, and plagiarism-proof. Include a brief explanation of what this AI topic involves, its current applications, and potential future implications. Make the content accessible but academically sound.

IMPORTANT:
1. Start with the title "${title}" on the first line.
2. Format your response with the title on the first line, then a blank line, followed by the 275-word paragraph on this AI topic.
3. DO NOT include or reference any specific person's name in the content.
4. Make the content focused specifically on the title topic.

Example format:
${title}

Content begins...`;
    
    const response = await callGeminiAPI(prompt);
    
    return {
        title: 'AI Paragraph',
        content: response,
        type: 'assignment3',
        icon: 'fa-robot'
    };
}

async function callGeminiAPI(prompt) {
    // Maximum number of retry attempts
    const maxRetries = 2;
    let retries = 0;
    let errorMessages = [];
    
    // List of model endpoints to try if the first one fails
    const modelEndpoints = [
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent",
        "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent", 
        "https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
    ];
    
    // Try each endpoint until one works or we run out of attempts
    for (let i = 0; i < modelEndpoints.length && retries <= maxRetries; i++) {
        const url = `${modelEndpoints[i]}?key=${GEMINI_API_KEY}`;
        
        try {
            console.log(`Sending request to Gemini API with prompt (attempt ${retries + 1}):`, prompt.substring(0, 50) + "...");
            console.log(`Using API endpoint: ${modelEndpoints[i]}`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.9,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error("API Error Response:", errorText);
                errorMessages.push(`[Attempt ${retries + 1}] ${errorText}`);
                throw new Error(`API request failed with status ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log("API Response:", data);
            
            // Handle different response formats
            if (data.candidates && data.candidates.length > 0) {
                if (data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                    return data.candidates[0].content.parts[0].text;
                } else if (data.candidates[0].text) {
                    return data.candidates[0].text;
                }
            }
            
            // If we can't extract the text through the normal paths, try a more generic approach
            if (data.candidates && data.candidates[0]) {
                // Try to extract text from any property that might contain it
                const candidate = data.candidates[0];
                if (typeof candidate === 'object') {
                    // Search for any property that might contain the generated text
                    for (const key in candidate) {
                        if (typeof candidate[key] === 'string' && candidate[key].length > 50) {
                            console.log(`Found potential text in property ${key}`);
                            return candidate[key];
                        } else if (typeof candidate[key] === 'object' && candidate[key] !== null) {
                            // Go one level deeper
                            for (const subKey in candidate[key]) {
                                if (typeof candidate[key][subKey] === 'string' && candidate[key][subKey].length > 50) {
                                    console.log(`Found potential text in property ${key}.${subKey}`);
                                    return candidate[key][subKey];
                                }
                            }
                        }
                    }
                }
                // If all else fails and we have a candidate, stringify it as a last resort
                return JSON.stringify(candidate);
            }
            
            if (data.error) {
                throw new Error(`API error: ${data.error.message || JSON.stringify(data.error)}`);
            }
            
            throw new Error('Could not extract text content from the API response');
            
        } catch (error) {
            console.error(`Error calling Gemini API (attempt ${retries + 1}):`, error);
            errorMessages.push(error.message);
            
            retries++;
            if (retries <= maxRetries && i < modelEndpoints.length - 1) {
                // Wait before retrying (exponential backoff)
                const waitTime = Math.pow(2, retries - 1) * 1000;
                console.log(`Retrying in ${waitTime}ms with next model...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    // If all attempts fail, generate a fallback response
    console.log("All API attempts failed, using fallback content");
    return generateFallbackContent(prompt);
}

// Generate fallback content
function generateFallbackContent(prompt) {
    // Use an array of options to create variety with short 3-4 word titles
    const storyTitles = [
        "Morning Light Awakens",
        "City In Motion",
        "Endless Now Unfolds",
        "Moments In Time",
        "Rhythms Of Life",
        "Windows And Reflections"
    ];
    
    const essayTitles = [
        "Digital Connection Matters",
        "Modern Communication Evolution",
        "Virtual Dialogue Era",
        "Words Beyond Distance",
        "Interconnected Expression Today"
    ];
    
    const aiTitles = [
        "Intelligence Without Boundaries",
        "Machines Learning Tomorrow",
        "Algorithmic Future Emerging",
        "Digital Minds Evolve",
        "Computational Cognition Advances"
    ];
    
    // Get random title
    const getRandomTitle = (array) => {
        return array[Math.floor(Math.random() * array.length)];
    };
    
    if (prompt.includes("Present tense")) {
        const title = getRandomTitle(storyTitles);
        
        return `${title}

The morning arrives with golden light filtering through half-drawn curtains. A journalist moves through a bustling city center, observing the world with attentive eyes. Every detail matters in this moment of discovery. The air feels different today. People are noticing it too - some pause to look up at the sky while others continue with their routines, unaware of the subtle shift. The observer has been watching these patterns for years, finding meaning in the rhythms most overlook.

"I am experiencing something unusual," the journalist thinks, recording observations in a worn notebook. Nearby conversations drift through the air, creating a backdrop of humanity's everyday symphony. While contemplating the significance of these observations, an unexpected encounter disrupts the routine. Someone is approaching with purpose, someone who has been searching for the right person to share a discovery.

The journalist has never seen such evidence before, despite years of careful study. This changes everything about the understanding that has been developing gradually over time. Suddenly, the surroundings transform as realization dawns. The city reveals itself with entirely new perspective. What was once familiar now unveils hidden dimensions and connections previously invisible.

The day continues unfolding, but nothing remains the same. The journalist moves forward with renewed purpose, carrying insights that illuminate both past and future. Sometimes transformation happens in an instant, even while the world around continues its familiar rhythm. What happens next remains unwritten, but the story is already taking shape with today's revelations. The present moment holds all possibilities, connecting what has come before with what is yet to emerge.`;
    } else if (prompt.includes("communication skills")) {
        const title = getRandomTitle(essayTitles);
        
        return `${title}

In our hyper-connected digital landscape, effective communication transcends traditional boundaries and creates unprecedented opportunities for human connection. The technological revolution has fundamentally transformed how we exchange information, build relationships, and collaborate across geographical and cultural divides.

Contemporary communication extends far beyond face-to-face interactions into a complex ecosystem of digital channels. Email correspondence demands clarity and conciseness, while video conferencing requires strong visual presence and digital etiquette. Social media engagement involves understanding platform-specific norms and audience expectations. Meanwhile, collaborative tools necessitate asynchronous communication skills previously underdeveloped in professional contexts.

Research consistently demonstrates that employers prioritize communication abilities as essential professional attributes. The capacity to articulate complex ideas clearly, listen actively during digital exchanges, and adapt messaging appropriately across diverse platforms directly correlates with career advancement opportunities. Organizations increasingly recognize that technical expertise without communication proficiency creates significant limitations for both individual and collective success.

Beyond professional contexts, digital communication fundamentally reshapes personal relationships. While technology enables connections across vast distances, it simultaneously requires developing new emotional intelligence capacities: conveying authentic tone in text-based exchanges, recognizing subtle emotional cues without physical presence, and maintaining meaningful connections through fragmented digital interactions.

Educational institutions now recognize communication as foundational rather than supplementary. Digital literacy—encompassing both critical consumption and effective creation of digital content—has become central to contemporary learning objectives at all educational levels. To navigate this complex communication landscape successfully, individuals must develop platform versatility, audience awareness, and authentic self-expression despite the often impersonal nature of digital interaction.`;
    } else if (prompt.includes("Artificial Intelligence")) {
        const title = getRandomTitle(aiTitles);
        
        return `${title}

Artificial Intelligence represents one of humanity's most transformative technological developments, fundamentally altering how we interact with machines and process information. At its core, AI encompasses computational systems designed to perform tasks traditionally requiring human intelligence—including visual perception, speech recognition, decision-making, and natural language understanding. Unlike conventional programming approaches, modern AI systems employ sophisticated machine learning algorithms that enable continuous improvement through data analysis and pattern recognition without explicit programming. These systems process vast information repositories to identify correlations and generate predictions with increasingly remarkable accuracy.

In contemporary society, AI applications have become ubiquitous—from voice assistants organizing schedules and recommending content to diagnostic tools enhancing medical decisions and autonomous systems revolutionizing transportation. Machine learning algorithms now power recommendation systems that curate social media feeds, streaming content, and shopping suggestions. Computer vision technologies enable advanced security systems, autonomous vehicles, and medical imaging analysis. Natural language processing facilitates automated customer service, real-time translation, and text analysis across countless industries.

Looking toward the horizon, researchers anticipate developments in artificial general intelligence that could potentially match or exceed human capabilities across diverse cognitive domains. This progression raises profound questions about the future nature of work, privacy boundaries, ethical frameworks for autonomous decision-making, and ultimately what constitutes uniquely human contribution in an increasingly automated world. Understanding AI's capabilities, limitations, and societal implications becomes essential for meaningful participation in shaping its responsible development and ensuring it advances human welfare while mitigating potential risks.`;
    } else {
        return `No specific content could be generated for this prompt. Please try a different prompt or try again later when our AI service is available.`;
    }
}

function displayResult(result) {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    
    // Extract title if present in content
    let content = result.content;
    let extractedTitle = '';
    
    // Check if content has a title at the beginning (either on its own line or with markdown formatting)
    const titleMatch = content.match(/^(?:\*\*)?([^\n]+?)(?:\*\*)?(?:\n+|$)/);
    if (titleMatch) {
        extractedTitle = titleMatch[1].trim();
        // Remove the title from the content
        content = content.replace(titleMatch[0], '').trim();
    }
    
    const resultTitle = document.createElement('h3');
    resultTitle.innerHTML = `<i class="fas ${result.icon}"></i> ${result.title}`;
    
    // Create separate title paragraph if extracted
    const titleParagraph = document.createElement('p');
    titleParagraph.className = 'result-title';
    titleParagraph.textContent = extractedTitle || '';
    
    // Process content for markdown formatting
    content = processMarkdown(content);
    
    // Count words in the content (excluding the title)
    const strippedContent = stripMarkdown(result.content.replace(titleMatch ? titleMatch[0] : '', '').trim());
    const wordCount = strippedContent.split(/\s+/).length;
    
    const resultContent = document.createElement('div');
    resultContent.className = 'result-card-content';
    resultContent.innerHTML = content; // Using innerHTML since we've processed the markdown
    
    // Create word count element
    const wordCountElement = document.createElement('div');
    wordCountElement.className = 'word-count';
    wordCountElement.textContent = `Word count: ${wordCount}`;
    
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-btn';
    copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
    copyButton.addEventListener('click', () => {
        // When copying, include both title and content, but as plain text
        const fullText = (extractedTitle ? extractedTitle + '\n\n' : '') + stripMarkdown(result.content);
        navigator.clipboard.writeText(fullText)
            .then(() => {
                showToast('Content copied to clipboard!', 'success');
            })
            .catch((error) => {
                console.error('Error copying to clipboard:', error);
                showToast('Failed to copy content', 'error');
            });
    });
    
    actionButtons.appendChild(copyButton);
    
    resultCard.appendChild(resultTitle);
    if (extractedTitle) {
        resultCard.appendChild(titleParagraph);
    }
    resultCard.appendChild(resultContent);
    resultCard.appendChild(wordCountElement); // Add word count element before action buttons
    resultCard.appendChild(actionButtons);
    
    resultsSection.appendChild(resultCard);
}

// Function to process markdown-like formatting
function processMarkdown(text) {
    // Handle bold text (** or __)
    text = text.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
    
    // Handle italic text (* or _)
    text = text.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');
    
    // Handle line breaks
    text = text.replace(/\n/g, '<br>');
    
    // Handle paragraphs (double line breaks)
    text = text.replace(/<br><br>/g, '</p><p>');
    
    // Wrap the text in paragraph tags
    text = '<p>' + text + '</p>';
    
    // Fix any empty paragraphs
    text = text.replace(/<p><\/p>/g, '');
    
    return text;
}

// Function to strip markdown for clipboard copying
function stripMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '$1$2')
        .replace(/\*(.*?)\*|_(.*?)_/g, '$1$2');
}

function showToast(message, type = 'success') {
    console.log(`Showing toast: ${message} (${type})`);
    
    // Remove existing toasts
    while (toastContainer.firstChild) {
        toastContainer.removeChild(toastContainer.firstChild);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    let title = type === 'success' ? 'Success' : 'Error';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    // Add close button
    const closeButton = document.createElement('div');
    closeButton.className = 'toast-close';
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    closeButton.addEventListener('click', function() {
        console.log("Toast close button clicked");
        if (toast.parentNode === toastContainer) {
            toastContainer.removeChild(toast);
        }
    });
    
    toast.appendChild(closeButton);
    toastContainer.appendChild(toast);
    console.log("Toast added to container");
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        if (toast.parentNode === toastContainer) {
            console.log("Automatically removing toast after timeout");
            toastContainer.removeChild(toast);
        }
    }, 5000);
}

async function logUserVisit() {
    try {
        // Get IP address info
        const ipInfo = await fetchIPInfo();
        if (ipInfo) {
            userInfo.ipAddress = ipInfo.ip;
            userInfo.ipLocation = {
                country: ipInfo.country_name || '',
                city: ipInfo.city || '',
                region: ipInfo.region || '',
                latitude: ipInfo.latitude || '',
                longitude: ipInfo.longitude || '',
                timezone: ipInfo.timezone || ''
            };
        }
        
        // Get device information
        userInfo.deviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            colorDepth: window.screen.colorDepth,
            orientation: window.screen.orientation ? window.screen.orientation.type : 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            } : 'unknown'
        };
        
        // Get referrer if available
        userInfo.referrer = document.referrer || 'direct';
        
        // Collect browser features
        userInfo.browserFeatures = {
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            webWorker: !!window.Worker,
            webGL: (function() {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
                } catch(e) {
                    return false;
                }
            })(),
            canvas: (function() {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(canvas.getContext && canvas.getContext('2d'));
                } catch(e) {
                    return false;
                }
            })()
        };
    } catch (error) {
        // Error collecting extended user info, continue
    }
    
    // Return a Promise that resolves when the user is logged
    return new Promise((resolve, reject) => {
        try {
            // Ensure we have a persistent user ID
            const userId = getUserId();
            userInfo.userId = userId;
            
            // Log directly to Realtime Database with improved structure
            if (rtdb) {
                // Add formatted timestamp
                const formattedTimestamp = formatTimestamp();
                
                // Structure: assignments/{userId}/visits/{visitId}
                const rtdbRef = rtdb.ref(`assignments/${userId}/visits/visit_${Date.now()}`);
                rtdbRef.set({
                    ...userInfo,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    formattedTimestamp: formattedTimestamp,
                    visitTime: formattedTimestamp
                })
                .then(() => {
                    // Also update the user's profile information
                    rtdb.ref(`assignments/${userId}/profile`).update({
                        name: userInfo.name,
                        subject: userInfo.subject,
                        lastActive: firebase.database.ServerValue.TIMESTAMP,
                        lastActiveFormatted: formattedTimestamp,
                        visits: firebase.database.ServerValue.increment(1)
                    });
                    
                    resolve(userId);
                })
                .catch((error) => {
                    resolve(userId); // Still resolve to continue app flow
                });
            } else {
                resolve(userId);
            }
        } catch (error) {
            // Generate a fallback ID to avoid later errors
            const fallbackId = getUserId();
            userInfo.userId = fallbackId;
            resolve(fallbackId);
        }
    });
}

async function logGeneration(results) {
    // Skip logging if userId is not available
    if (!userInfo.userId) {
        return;
    }
    
    try {
        const formattedTimestamp = formatTimestamp();
        
        // Create a generation record
        const generation = {
            userId: userInfo.userId,
            userName: userInfo.name,
            userSubject: userInfo.subject,
            timestamp: formattedTimestamp,
            assignments: results.map(result => ({
                type: result.type,
                title: result.title,
                contentLength: result.content.length,
                wordCount: stripMarkdown(result.content).trim().split(/\s+/).length
            })),
            // Device information
            deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };
        
        // Add IP address if available
        if (userInfo.ipAddress) {
            generation.ipAddress = userInfo.ipAddress;
            generation.ipLocation = userInfo.ipLocation;
        } else {
            // Try to get IP if not already collected
            try {
                const ipInfo = await fetchIPInfo();
                if (ipInfo) {
                    generation.ipAddress = ipInfo.ip;
                    generation.ipLocation = {
                        country: ipInfo.country_name || '',
                        city: ipInfo.city || '',
                        region: ipInfo.region || ''
                    };
                }
            } catch (error) {
                // Continue without IP info
            }
        }
        
        // Only log to Realtime Database with improved structure
        if (rtdb) {
            // Generate a unique ID for this generation
            const genId = 'gen_' + Date.now();
            
            // Structure: assignments/{userId}/generations/{generationId}
            const rtdbRef = rtdb.ref(`assignments/${userInfo.userId}/generations/${genId}`);
            await rtdbRef.set({
                ...generation,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                formattedTimestamp: formattedTimestamp
            });
            
            // Update user's total generations count
            await rtdb.ref(`assignments/${userInfo.userId}/profile`).update({
                lastGeneration: firebase.database.ServerValue.TIMESTAMP,
                lastGenerationFormatted: formattedTimestamp,
                totalGenerations: firebase.database.ServerValue.increment(results.length)
            });
            
            // Add to the recent_generations node for real-time notifications to all users
            const recentGenRef = rtdb.ref(`recent_generations/gen_${Date.now()}`);
            await recentGenRef.set({
                userId: userInfo.userId,
                userName: userInfo.name || 'Anonymous',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                formattedTimestamp: formattedTimestamp,
                assignmentTypes: results.map(r => r.type)
            });
            
            // Cleanup old entries (keep only latest 20)
            await cleanupRecentGenerations();
        }
    } catch (error) {
        // Error logging generation, continue
    }
}

// Cleanup old generation notifications to prevent the list from growing too large
async function cleanupRecentGenerations() {
    try {
        if (!rtdb) return;
        
        const recentGenRef = rtdb.ref('recent_generations');
        const snapshot = await recentGenRef.orderByChild('timestamp').once('value');
        
        // Count the entries
        let entries = [];
        snapshot.forEach(childSnapshot => {
            entries.push({
                key: childSnapshot.key,
                timestamp: childSnapshot.val().timestamp
            });
        });
        
        // If we have more than 20 entries, remove the oldest ones
        if (entries.length > 20) {
            // Sort by timestamp (oldest first)
            entries.sort((a, b) => a.timestamp - b.timestamp);
            
            // Delete oldest entries to keep only the latest 20
            const entriesToDelete = entries.slice(0, entries.length - 20);
            for (const entry of entriesToDelete) {
                await rtdb.ref(`recent_generations/${entry.key}`).remove();
            }
        }
    } catch (error) {
        // Error cleaning up, continue
    }
}

async function logLinkedinClick() {
    // Skip logging if userId is not available
    if (!userInfo.userId) {
        return;
    }
    
    try {
        // Increment the counter
        userInfo.linkedinClicks += 1;
        
        // Create formatted timestamp
        const formattedTimestamp = formatTimestamp();
        
        // Log the click to Firebase RTDB with improved structure
        if (rtdb) {
            const clickData = {
                userId: userInfo.userId,
                userName: userInfo.name || 'Anonymous',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                formattedTimestamp: formattedTimestamp,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                referrer: document.referrer || 'direct'
            };
            
            // Structure: assignments/{userId}/linkedin_clicks/{clickId}
            const clickId = 'click_' + Date.now();
            
            // Add to LinkedIn clicks collection in RTDB
            await rtdb.ref(`assignments/${userInfo.userId}/linkedin_clicks/${clickId}`).set(clickData);
            
            // Update the user's profile in RTDB
            await rtdb.ref(`assignments/${userInfo.userId}/profile`).update({
                linkedinClicks: firebase.database.ServerValue.increment(1),
                lastLinkedinClick: firebase.database.ServerValue.TIMESTAMP,
                lastLinkedinClickFormatted: formattedTimestamp
            });
            
            // Hide the LinkedIn popup if it's visible
            if (linkedinPopup) {
                linkedinPopup.classList.add('hidden');
            }
        }
    } catch (error) {
        // Error logging LinkedIn click, continue
    }
}

// Fetch IP information
async function fetchIPInfo() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching IP info:', error);
        return null;
    }
}

// Collect additional user information for logging
function collectUserInfo() {
    // Get referring website
    userInfo.referrer = document.referrer;
    
    // Check if user is on mobile
    userInfo.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Get connection type if available
    if (navigator.connection) {
        userInfo.connectionType = navigator.connection.effectiveType;
    }
    
    // Will attempt to get location info later at login time
}

// Initialize the application
function init() {
    console.log("Application initializing");
    collectUserInfo();
    
    // Setup Firebase listeners for real-time notifications
    setupRecentGenerationsListener();
    
    console.log("Application initialization complete");
}

// Setup Firebase listener for recent generations from any user
function setupRecentGenerationsListener() {
    if (!rtdb) {
        return; // Skip if Firebase is not available
    }
    
    // Set initial timestamp to filter only new generations
    lastGenerationTimestamp = Date.now();
    
    // Listen for new generations across all users
    // We'll listen to a special 'recent_generations' node that will be updated on each generation
    recentGenerationsListener = rtdb.ref('recent_generations').orderByChild('timestamp').startAt(lastGenerationTimestamp);
    
    recentGenerationsListener.on('child_added', (snapshot) => {
        const generation = snapshot.val();
        
        // Ignore our own generations
        if (generation.userId === getUserId()) {
            return;
        }
        
        // Update last timestamp
        if (generation.timestamp > lastGenerationTimestamp) {
            lastGenerationTimestamp = generation.timestamp;
        }
        
        // Show notification for the new generation
        showGenerationNotification(generation);
    });
}

// Show notification when another user generates assignments
function showGenerationNotification(generation) {
    const userName = generation.userName || 'Someone';
    
    // Show toast notification
    showToast(`${userName} just generated their assignments!`, 'success');
    
    // Update recent generations display
    updateRecentGenerationsDisplay(generation);
}

// Update the UI with recent generations
// function updateRecentGenerationsDisplay(newGeneration = null) {
//     // Find or create the recent generations container
//     let recentGenerationsContainer = document.getElementById('recent-generations');
//     if (!recentGenerationsContainer) {
//         // Create the container if it doesn't exist
//         const mainSection = document.getElementById('main-section');
//         if (!mainSection) return;
        
//         recentGenerationsContainer = document.createElement('div');
//         recentGenerationsContainer.id = 'recent-generations';
//         recentGenerationsContainer.className = 'recent-generations-container';
        
//         // Create title
//         // const title = document.createElement('h3');
//         // title.className = 'recent-generations-title';
//         // title.textContent = 'Recent Activity';
//         // recentGenerationsContainer.appendChild(title);
        
//         // // Create list
//         // const list = document.createElement('ul');
//         // list.className = 'recent-generations-list';
//         // list.id = 'recent-generations-list';
//         // recentGenerationsContainer.appendChild(list);
        
//         // Add to main section (after the header)
//         const firstCard = mainSection.querySelector('.card');
//         if (firstCard) {
//             mainSection.insertBefore(recentGenerationsContainer, firstCard);
//         } else {
//             mainSection.appendChild(recentGenerationsContainer);
//         }
        
//         // Add styles for the recent generations
//         addRecentGenerationsStyles();
//     }
    
//     // If we have a new generation, add it to the list
//     if (newGeneration) {
//         const list = document.getElementById('recent-generations-list');
//         if (!list) return;
        
//         const listItem = document.createElement('li');
//         listItem.className = 'recent-generation-item';
//         listItem.innerHTML = `
//             <span class="activity-user">${newGeneration.userName || 'Someone'}</span>
//             <span class="activity-action">generated assignments</span>
//             <span class="activity-time">${formatTimeAgo(newGeneration.timestamp)}</span>
//         `;
        
//         // Add animation
//         listItem.style.animation = 'slideInRight 0.5s ease forwards';
        
//         // Add to the beginning of the list
//         if (list.firstChild) {
//             list.insertBefore(listItem, list.firstChild);
//         } else {
//             list.appendChild(listItem);
//         }
        
//         // Limit to maximum 5 items
//         while (list.children.length > 5) {
//             list.removeChild(list.lastChild);
//         }
//     } else {
//         // Initial load - fetch recent generations from Firebase
//         loadRecentGenerations();
//     }
// }

// Load recent generations from Firebase
async function loadRecentGenerations() {
    if (!rtdb) return;
    
    try {
        const recentGenRef = rtdb.ref('recent_generations').orderByChild('timestamp').limitToLast(5);
        const snapshot = await recentGenRef.once('value');
        
        // Get all items and sort by timestamp (newest first)
        const items = [];
        snapshot.forEach(childSnapshot => {
            items.push(childSnapshot.val());
        });
        
        // Sort by timestamp (newest first)
        items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        // Add each item to the display
        const list = document.getElementById('recent-generations-list');
        if (!list) return;
        
        // Clear the list
        list.innerHTML = '';
        
        // Add items
        items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'recent-generation-item';
            listItem.innerHTML = `
                <span class="activity-user">${item.userName || 'Someone'}</span>
                <span class="activity-action">generated assignments</span>
                <span class="activity-time">${formatTimeAgo(item.timestamp)}</span>
            `;
            list.appendChild(listItem);
        });
        
        // If no items, show a message
        if (items.length === 0) {
            const listItem = document.createElement('li');
            listItem.className = 'recent-generation-item empty';
            listItem.textContent = 'No recent activity';
            list.appendChild(listItem);
        }
    } catch (error) {
        console.error('Error loading recent generations:', error);
    }
}

// Format timestamp as relative time (e.g., "2 minutes ago")
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'just now';
    
    // If it's a Firebase server timestamp object, it might not be resolved yet
    if (typeof timestamp === 'object' && timestamp !== null) {
        return 'just now';
    }
    
    let time;
    if (typeof timestamp === 'string') {
        // Try to convert date string to timestamp
        const date = new Date(timestamp);
        if (isNaN(date)) {
            return 'recently';
        }
        time = date.getTime();
    } else {
        time = timestamp;
    }
    
    const now = Date.now();
    const diff = now - time;
    
    // Time units in milliseconds
    const minute = 60 * 1000;
    const hour = minute * 60;
    const day = hour * 24;
    
    if (diff < minute) {
        return 'just now';
    } else if (diff < hour) {
        const minutes = Math.floor(diff / minute);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < day) {
        const hours = Math.floor(diff / hour);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diff / day);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

// Add CSS styles for the recent generations display
function addRecentGenerationsStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .recent-generations-container {
            background-color: var(--card-bg);
            border-radius: 8px;
            padding: 15px 20px;
            margin-bottom: 20px;
            box-shadow: var(--shadow);
            border-left: 4px solid var(--primary-color);
        }
        
        .recent-generations-title {
            color: var(--primary-color);
            font-size: 1.2rem;
            margin-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 5px;
        }
        
        .recent-generations-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .recent-generation-item {
            padding: 8px 0;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            font-size: 0.9rem;
        }
        
        .recent-generation-item:last-child {
            border-bottom: none;
        }
        
        .recent-generation-item.empty {
            color: var(--light-text);
            font-style: italic;
            text-align: center;
        }
        
        .activity-user {
            font-weight: 600;
            color: var(--primary-color);
            margin-right: 5px;
        }
        
        .activity-action {
            color: var(--text-color);
            margin-right: 5px;
        }
        
        .activity-time {
            color: var(--light-text);
            margin-left: auto;
            font-style: italic;
        }
        
        @media (max-width: 768px) {
            .recent-generation-item {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .activity-time {
                margin-left: 0;
                margin-top: 3px;
                font-size: 0.8rem;
            }
        }
    `;
    document.head.appendChild(style);
}

// Theme Switcher Functionality
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    
    // Check if user previously selected a theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'dark';
    
    // Add event listener for theme toggle
    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });
    
    // ... existing DOMContentLoaded code ...
});

// Function to display feedback form after generation
function showFeedbackForm() {
    // Remove any existing feedback section first
    const existingFeedback = document.querySelector('.feedback-section');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    const feedbackSection = document.createElement('div');
    feedbackSection.className = 'feedback-section';
    feedbackSection.innerHTML = `
        <div class="card">
            <h3 class="section-title">How was your experience?</h3>
            <div class="star-rating">
                <span class="star" data-rating="1"><i class="far fa-star"></i></span>
                <span class="star" data-rating="2"><i class="far fa-star"></i></span>
                <span class="star" data-rating="3"><i class="far fa-star"></i></span>
                <span class="star" data-rating="4"><i class="far fa-star"></i></span>
                <span class="star" data-rating="5"><i class="far fa-star"></i></span>
            </div>
            <div class="rating-value">0/5</div>
            <textarea id="feedback-text" placeholder="Any additional feedback? (optional)"></textarea>
            <button id="submit-feedback" class="submit-feedback-btn" disabled>Submit Feedback</button>
        </div>
    `;
    
    document.getElementById('results-section').appendChild(feedbackSection);
    
    // Wait for elements to be in the DOM
    setTimeout(() => {
        // Add event listeners for stars
        const stars = document.querySelectorAll('.star');
        const ratingValueDisplay = document.querySelector('.rating-value');
        const submitButton = document.getElementById('submit-feedback');
        let selectedRating = 0;
        
        if (!stars.length || !ratingValueDisplay || !submitButton) {
            return;
        }
        
        stars.forEach(star => {
            // Make sure each star is individually clickable
            star.style.pointerEvents = 'auto';
            star.style.cursor = 'pointer';
            
            star.addEventListener('mouseover', function() {
                const rating = parseInt(this.getAttribute('data-rating'));
                highlightStars(rating);
            });
            
            star.addEventListener('mouseout', function() {
                highlightStars(selectedRating);
            });
            
            star.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                selectedRating = parseInt(this.getAttribute('data-rating'));
                highlightStars(selectedRating);
                ratingValueDisplay.textContent = `${selectedRating}/5`;
                
                // Enable submit button
                submitButton.disabled = false;
                submitButton.style.cursor = 'pointer';
                submitButton.style.opacity = '1';
            });
        });
        
        // Function to highlight stars
        function highlightStars(count) {
            stars.forEach(star => {
                const starRating = parseInt(star.getAttribute('data-rating'));
                if (starRating <= count) {
                    star.innerHTML = '<i class="fas fa-star"></i>';
                } else {
                    star.innerHTML = '<i class="far fa-star"></i>';
                }
            });
        }
        
        // Add event listener for submit button
        submitButton.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            const feedbackText = document.getElementById('feedback-text').value;
            submitFeedback(selectedRating, feedbackText);
        });
    }, 100);
}

// Function to submit feedback to Firebase
async function submitFeedback(rating, feedbackText) {
    try {
        // Create a feedback object
        const feedback = {
            userId: getUserId(),
            userName: userInfo.name || 'Anonymous',
            rating: rating,
            feedback: feedbackText || '',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            formattedTimestamp: formatTimestamp(),
            deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform
            }
        };
        
        // Save to Firebase
        if (rtdb) {
            const feedbackRef = rtdb.ref(`assignments/${feedback.userId}/feedback/feedback_${Date.now()}`);
            await feedbackRef.set(feedback);
            
            // Show thank you message
            showToast('Thank you for your feedback!', 'success');
            
            // Remove the feedback form
            const feedbackSection = document.querySelector('.feedback-section');
            if (feedbackSection) {
                feedbackSection.remove();
            }
        } else {
            showToast('Thank you for your feedback!', 'success');
            
            // Still remove the form
            const feedbackSection = document.querySelector('.feedback-section');
            if (feedbackSection) {
                feedbackSection.remove();
            }
        }
    } catch (error) {
        showToast('Error submitting feedback', 'error');
    }
}

// Add CSS styles for the feedback system
(function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Feedback System Styles */
        .feedback-section {
            margin-top: 30px;
        }
        
        .star-rating {
            display: flex;
            justify-content: center;
            margin: 20px 0 10px;
        }
        
        .star {
            font-size: 2rem;
            color: var(--star-color, #ffc107);
            cursor: pointer !important;
            margin: 0 10px;
            transition: transform 0.2s;
            display: inline-block;
            pointer-events: auto !important;
            user-select: none;
        }
        
        .star:hover {
            transform: scale(1.2);
        }
        
        .star i {
            pointer-events: none;
        }
        
        .rating-value {
            text-align: center;
            margin-bottom: 15px;
            font-weight: 500;
            color: var(--light-text);
        }
        
        #feedback-text {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background-color: var(--card-bg);
            color: var(--text-color);
            margin-bottom: 15px;
            min-height: 80px;
            resize: vertical;
        }
        
        .submit-feedback-btn {
            background-color: var(--accent-color);
            display: block;
            margin: 0 auto;
            padding: 10px 30px;
            font-size: 1rem;
            border-radius: 4px;
            transition: all 0.3s ease;
        }
        
        .submit-feedback-btn:disabled {
            background-color: var(--border-color);
            cursor: not-allowed !important;
            opacity: 0.7;
        }
        
        .submit-feedback-btn:not(:disabled):hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
    `;
    document.head.appendChild(style);
})();

// Start the application
console.log("Starting application");
init();

// Add CSS styles for the results
(function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .result-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-top: 1rem;
            margin-bottom: 1.5rem;
            color: var(--title-color, #2c3e50);
            text-align: center;
            letter-spacing: 0.5px;
            border-bottom: 2px solid var(--title-border, #eaeaea);
            padding-bottom: 0.75rem;
        }
        
        .result-card-content {
            line-height: 1.6;
            text-align: justify;
        }
        
        .result-card-content p {
            margin-bottom: 1rem;
        }
        
        .result-card-content strong {
            font-weight: 600;
            color: var(--strong-color, #333);
        }
        
        .result-card-content em {
            font-style: italic;
            color: var(--em-color, #555);
        }
        
        .word-count {
            font-size: 0.85rem;
            color: var(--word-count-color, #666);
            text-align: right;
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
            font-style: italic;
        }
    `;
    document.head.appendChild(style);
})(); 