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

// Debug DOM elements
console.log("Welcome Section:", welcomeSection);
console.log("Main Section:", mainSection);
console.log("Start Button:", startBtn);
console.log("Subject Select:", subjectSelect);

// Get the LinkedIn link and add click tracking
const linkedinLink = document.querySelector('.footer a');
if (linkedinLink) {
    linkedinLink.addEventListener('click', logLinkedinClick);
    console.log("LinkedIn link event listener added");
} else {
    console.warn("LinkedIn link not found in the DOM");
}

// Assignment Checkboxes
const assignment1Checkbox = document.getElementById('assignment1');
const assignment2Checkbox = document.getElementById('assignment2');
const assignment3Checkbox = document.getElementById('assignment3');

// User Information
let userName = '';
let userSubject = '';
let userInfo = {
    name: '',
    subject: '',
    browser: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString(),
    generations: [],
    linkedinClicks: 0
};

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
    
    userName = name;
    userSubject = subject;
    userInfo.name = name;
    userInfo.subject = subject;
    
    if (userNameDisplay) {
        userNameDisplay.textContent = `Welcome, ${userName}! (${userSubject})`;
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
        selectedAssignments.push(generateAssignment1());
    }
    
    if (assignment2Checkbox && assignment2Checkbox.checked) {
        selectedAssignments.push(generateAssignment2());
    }
    
    if (assignment3Checkbox && assignment3Checkbox.checked) {
        selectedAssignments.push(generateAssignment3());
    }
    
    try {
        const results = await Promise.all(selectedAssignments);
        results.forEach(displayResult);
        
        // Show generation toast - keeping this one as requested
        showToast(`${userName} just generated their assignments!`, 'success');
        
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

async function generateAssignment1() {
    const prompt = `Write a unique story using all categories of Present tense (simple present, present continuous, present perfect, and present perfect continuous). 

The story should be exactly 275 words, creative, engaging, and clearly demonstrate each tense category. Include at least one example of each tense category. Each sentence should use a different present tense category where possible.

IMPORTANT: 
1. Start with a very short title (3-4 words maximum).
2. Format your response with the title on the first line, then a blank line, followed by the 275-word story.
3. DO NOT use any specific names in the story.
4. Make the title catchy and relevant to the story's theme.

Example format:
Title Here

Story content begins...`;
    
    const response = await callGeminiAPI(prompt);
    
    return {
        title: 'Present Tense Story',
        content: response,
        type: 'assignment1',
        icon: 'fa-book'
    };
}

async function generateAssignment2() {
    const prompt = `Write a unique, plagiarism-proof essay on the importance of communication skills in a digital age. 

The essay should be exactly 275 words, formal and professional in tone, with clear paragraphs and a logical structure. Include an introduction with a thesis statement, body paragraphs with supporting evidence and examples, and a conclusion. Mention current digital platforms and technologies where relevant. Address how communication skills affect professional success, relationships, and personal development.

IMPORTANT:
1. Start with a very short title (3-4 words maximum).
2. Format your response with the title on the first line, then a blank line, followed by the 275-word essay.
3. DO NOT include or reference any specific person's name in the essay.
4. Make the title concise but descriptive of the essay's main theme.

Example format:
Digital Communication Matters

Essay content begins...`;
    
    const response = await callGeminiAPI(prompt);
    
    return {
        title: 'Communication Skills Essay',
        content: response,
        type: 'assignment2',
        icon: 'fa-comments'
    };
}

async function generateAssignment3() {
    const prompt = `Write a concise, unique paragraph on Artificial Intelligence.

The paragraph should be exactly 275 words, informative, professional, and plagiarism-proof. Include a brief explanation of what AI is, its current applications, and potential future implications. Make the content accessible but academically sound.

IMPORTANT:
1. Start with a very short title (3-4 words maximum).
2. Format your response with the title on the first line, then a blank line, followed by the 275-word paragraph on AI.
3. DO NOT include or reference any specific person's name in the content.
4. Make the title concise but descriptive of the main theme.

Example format:
AI's Boundless Horizon

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
    console.log("logUserVisit function called");
    
    try {
        // Get IP address info
        const ipInfo = await fetchIPInfo();
        if (ipInfo) {
            userInfo.ipAddress = ipInfo.ip;
            userInfo.ipLocation = {
                country: ipInfo.country_name || '',
                city: ipInfo.city || '',
                region: ipInfo.region || ''
            };
            console.log("IP information collected");
        }
    } catch (error) {
        console.error("Error fetching IP info:", error);
    }
    
    console.log("Logging user visit to Firebase RTDB");
    
    // Return a Promise that resolves when the user is logged
    return new Promise((resolve, reject) => {
        try {
            // Generate a unique ID
            const uniqueId = 'user_' + new Date().getTime();
            userInfo.userId = uniqueId;
            
            // Log directly to Realtime Database
            if (rtdb) {
                const rtdbRef = rtdb.ref('visits/' + uniqueId);
                rtdbRef.set({
                    ...userInfo,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                })
                .then(() => {
                    console.log('User logged to RTDB successfully with ID:', uniqueId);
                    resolve(uniqueId);
                })
                .catch((error) => {
                    console.error('Error logging to RTDB:', error);
                    resolve(uniqueId); // Still resolve to continue app flow
                });
            } else {
                console.warn('RTDB not available, using fallback ID');
                resolve(uniqueId);
            }
        } catch (error) {
            console.error('Exception in logUserVisit:', error);
            // Generate a fallback ID to avoid later errors
            const fallbackId = 'exception-' + new Date().getTime();
            console.log('Using exception fallback ID:', fallbackId);
            userInfo.userId = fallbackId;
            resolve(fallbackId);
        }
    });
}

async function logGeneration(results) {
    // Skip logging if userId is not available
    if (!userInfo.userId) {
        console.warn('Cannot log generation: userId is not available');
        return;
    }
    
    try {
        const timestamp = new Date().toISOString();
        
        // Create a generation record
        const generation = {
            userId: userInfo.userId,
            userName: userInfo.name,
            userSubject: userInfo.subject,
            timestamp: timestamp,
            assignments: results.map(result => ({
                type: result.type,
                title: result.title
            })),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        // Add to user's generations array
        userInfo.generations.push(generation);
        
        // Get IP address if not already collected
        if (!userInfo.ipAddress) {
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
                console.error("Error fetching IP info for generation log:", error);
            }
        } else {
            generation.ipAddress = userInfo.ipAddress;
            generation.ipLocation = userInfo.ipLocation;
        }
        
        // Only log to Realtime Database
        if (rtdb) {
            // Generate a unique ID for this generation
            const genId = 'gen_' + new Date().getTime();
            
            // Log generation details
            const rtdbRef = rtdb.ref('generations/' + genId);
            await rtdbRef.set({
                ...generation,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Update user's generations array
            await rtdb.ref('users/' + userInfo.userId + '/generations').set(userInfo.generations);
            
            console.log('Generation logged to RTDB successfully with ID:', genId);
        } else {
            console.warn('RTDB not available, generation not logged');
        }
    } catch (error) {
        console.error('Error logging generation:', error);
    }
}

async function logLinkedinClick() {
    // Skip logging if userId is not available
    if (!userInfo.userId) {
        console.warn('Cannot log LinkedIn click: userId is not available');
        return;
    }
    
    try {
        // Increment the counter
        userInfo.linkedinClicks += 1;
        
        // Log the click to Firebase RTDB
        if (rtdb) {
            const linkedinClick = {
                userId: userInfo.userId,
                userName: userInfo.name,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                userAgent: navigator.userAgent,
                platform: navigator.platform
            };
            
            // Generate a unique click ID
            const clickId = 'click_' + new Date().getTime();
            
            // Add to LinkedIn clicks collection in RTDB
            await rtdb.ref('linkedin_clicks/' + clickId).set(linkedinClick);
            
            // Update the user document in RTDB
            await rtdb.ref('users/' + userInfo.userId + '/linkedinClicks').set(userInfo.linkedinClicks);
            
            console.log('LinkedIn click logged to RTDB');
        } else {
            console.warn('RTDB not available, LinkedIn click not logged');
        }
    } catch (error) {
        console.error('Error logging LinkedIn click:', error);
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
    console.log("User info collected:", userInfo);
    console.log("Application initialization complete");
}

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
            color: #2c3e50;
            text-align: center;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #eaeaea;
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
            color: #333;
        }
        
        .result-card-content em {
            font-style: italic;
            color: #555;
        }
        
        .word-count {
            font-size: 0.85rem;
            color: #666;
            text-align: right;
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
            font-style: italic;
        }
    `;
    document.head.appendChild(style);
})(); 