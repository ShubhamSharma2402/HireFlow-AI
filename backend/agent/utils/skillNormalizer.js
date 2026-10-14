/**
 * Skill Normalizer and Taxonomy for HireFlow AI
 * Provides comprehensive technical skill dictionary, synonym normalization,
 * and deterministic skill extraction.
 */

// Canonical alias/synonym mappings
const SYNONYMS = {
  // Languages
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'py': 'Python',
  'python': 'Python',
  'python3': 'Python',
  'golang': 'Go',
  'go': 'Go',
  'c++': 'C++',
  'cpp': 'C++',
  'c#': 'C#',
  'csharp': 'C#',
  'c': 'C',
  'java': 'Java',
  'ruby': 'Ruby',
  'php': 'PHP',
  'swift': 'Swift',
  'kotlin': 'Kotlin',
  'scala': 'Scala',
  'rust': 'Rust',
  'dart': 'Dart',
  'r': 'R',
  'sql': 'SQL',
  'pl/sql': 'PL/SQL',
  'bash': 'Bash',
  'shell': 'Shell Scripting',
  'powershell': 'PowerShell',
  'html': 'HTML5',
  'html5': 'HTML5',
  'css': 'CSS3',
  'css3': 'CSS3',

  // Frontend
  'react': 'React',
  'react.js': 'React',
  'reactjs': 'React',
  'react native': 'React Native',
  'reactnative': 'React Native',
  'redux': 'Redux',
  'next': 'Next.js',
  'next.js': 'Next.js',
  'nextjs': 'Next.js',
  'vue': 'Vue.js',
  'vue.js': 'Vue.js',
  'vuejs': 'Vue.js',
  'nuxt': 'Nuxt.js',
  'nuxtjs': 'Nuxt.js',
  'angular': 'Angular',
  'angularjs': 'Angular',
  'svelte': 'Svelte',
  'sveltekit': 'SvelteKit',
  'tailwind': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  'bootstrap': 'Bootstrap',
  'sass': 'Sass',
  'scss': 'Sass',
  'less': 'Less',
  'webpack': 'Webpack',
  'vite': 'Vite',
  'material ui': 'Material UI',
  'mui': 'Material UI',
  'chakra': 'Chakra UI',
  'chakra ui': 'Chakra UI',

  // Backend
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'express': 'Express.js',
  'express.js': 'Express.js',
  'expressjs': 'Express.js',
  'nest': 'NestJS',
  'nestjs': 'NestJS',
  'nest.js': 'NestJS',
  'fastapi': 'FastAPI',
  'flask': 'Flask',
  'django': 'Django',
  'spring': 'Spring Boot',
  'spring boot': 'Spring Boot',
  'rails': 'Ruby on Rails',
  'ruby on rails': 'Ruby on Rails',
  'asp.net': 'ASP.NET',
  '.net': '.NET',
  'dotnet': '.NET',

  // APIs & Architectures
  'rest': 'REST APIs',
  'restful': 'REST APIs',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  'restful api': 'REST APIs',
  'restful apis': 'REST APIs',
  'graphql': 'GraphQL',
  'grpc': 'gRPC',
  'websocket': 'WebSockets',
  'websockets': 'WebSockets',
  'microservices': 'Microservices',
  'microservice': 'Microservices',
  'event driven': 'Event-Driven Architecture',
  'system design': 'System Design',

  // Databases & Caching
  'mongodb': 'MongoDB',
  'mongo': 'MongoDB',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'pgsql': 'PostgreSQL',
  'mysql': 'MySQL',
  'sqlite': 'SQLite',
  'redis': 'Redis',
  'elasticsearch': 'Elasticsearch',
  'cassandra': 'Cassandra',
  'dynamodb': 'DynamoDB',
  'firebase': 'Firebase',
  'firestore': 'Firestore',
  'supabase': 'Supabase',
  'mariadb': 'MariaDB',
  'oracle': 'Oracle',
  'snowflake': 'Snowflake',
  'bigquery': 'BigQuery',
  'prisma': 'Prisma',
  'mongoose': 'Mongoose',
  'sequelize': 'Sequelize',
  'typeorm': 'TypeORM',

  // Cloud & DevOps
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'gcp': 'Google Cloud (GCP)',
  'google cloud': 'Google Cloud (GCP)',
  'google cloud platform': 'Google Cloud (GCP)',
  'azure': 'Microsoft Azure',
  'microsoft azure': 'Microsoft Azure',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'terraform': 'Terraform',
  'ansible': 'Ansible',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',
  'jenkins': 'Jenkins',
  'github actions': 'GitHub Actions',
  'gitlab ci': 'GitLab CI',
  'linux': 'Linux',
  'nginx': 'Nginx',
  'apache': 'Apache',

  // Testing
  'jest': 'Jest',
  'mocha': 'Mocha',
  'cypress': 'Cypress',
  'playwright': 'Playwright',
  'selenium': 'Selenium',
  'pytest': 'PyTest',
  'junit': 'JUnit',
  'unit testing': 'Unit Testing',
  'unit tests': 'Unit Testing',
  'integration testing': 'Integration Testing',
  'tdd': 'TDD',

  // Version Control & Tools
  'git': 'Git',
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'jira': 'Jira',
  'postman': 'Postman',
  'agile': 'Agile',
  'scrum': 'Scrum',
  'figma': 'Figma',

  // AI, ML & Data
  'machine learning': 'Machine Learning',
  'deep learning': 'Deep Learning',
  'ai': 'Artificial Intelligence',
  'artificial intelligence': 'Artificial Intelligence',
  'data science': 'Data Science',
  'pandas': 'Pandas',
  'numpy': 'NumPy',
  'scikit-learn': 'Scikit-Learn',
  'sklearn': 'Scikit-Learn',
  'tensorflow': 'TensorFlow',
  'pytorch': 'PyTorch',
  'nlp': 'NLP',
  'natural language processing': 'NLP',
  'llm': 'LLMs',
  'llms': 'LLMs',
  'large language models': 'LLMs',
  'rag': 'RAG',
  'langchain': 'LangChain',
  'huggingface': 'Hugging Face',
  'hugging face': 'Hugging Face',
  'opencv': 'OpenCV',
  'kafka': 'Apache Kafka',
  'apache kafka': 'Apache Kafka',
  'rabbitmq': 'RabbitMQ',
  'spark': 'Apache Spark',
  'hadoop': 'Hadoop',
  'tableau': 'Tableau',
  'power bi': 'Power BI',
  'powerbi': 'Power BI',

  // Security & Authentication
  'jwt': 'JWT',
  'oauth': 'OAuth 2.0',
  'oauth2': 'OAuth 2.0',
  'oauth 2.0': 'OAuth 2.0',
  'sso': 'SSO',
};

// Skill categorization lookup
const CATEGORY_MAP = {
  'JavaScript': 'Programming Languages',
  'TypeScript': 'Programming Languages',
  'Python': 'Programming Languages',
  'Java': 'Programming Languages',
  'C++': 'Programming Languages',
  'C#': 'Programming Languages',
  'C': 'Programming Languages',
  'Go': 'Programming Languages',
  'Ruby': 'Programming Languages',
  'PHP': 'Programming Languages',
  'Swift': 'Programming Languages',
  'Kotlin': 'Programming Languages',
  'Rust': 'Programming Languages',
  'SQL': 'Programming Languages',
  'HTML5': 'Frontend',
  'CSS3': 'Frontend',
  'React': 'Frontend',
  'React Native': 'Mobile',
  'Redux': 'Frontend',
  'Next.js': 'Frontend',
  'Vue.js': 'Frontend',
  'Nuxt.js': 'Frontend',
  'Angular': 'Frontend',
  'Svelte': 'Frontend',
  'Tailwind CSS': 'Frontend',
  'Bootstrap': 'Frontend',
  'Node.js': 'Backend',
  'Express.js': 'Backend',
  'NestJS': 'Backend',
  'FastAPI': 'Backend',
  'Flask': 'Backend',
  'Django': 'Backend',
  'Spring Boot': 'Backend',
  'Ruby on Rails': 'Backend',
  '.NET': 'Backend',
  'REST APIs': 'Backend',
  'GraphQL': 'Backend',
  'gRPC': 'Backend',
  'WebSockets': 'Backend',
  'Microservices': 'Backend',
  'MongoDB': 'Databases',
  'PostgreSQL': 'Databases',
  'MySQL': 'Databases',
  'SQLite': 'Databases',
  'Redis': 'Databases',
  'Elasticsearch': 'Databases',
  'Cassandra': 'Databases',
  'DynamoDB': 'Databases',
  'Firebase': 'Databases',
  'Supabase': 'Databases',
  'AWS': 'Cloud & DevOps',
  'Google Cloud (GCP)': 'Cloud & DevOps',
  'Microsoft Azure': 'Cloud & DevOps',
  'Docker': 'Cloud & DevOps',
  'Kubernetes': 'Cloud & DevOps',
  'Terraform': 'Cloud & DevOps',
  'Ansible': 'Cloud & DevOps',
  'CI/CD': 'Cloud & DevOps',
  'Jenkins': 'Cloud & DevOps',
  'GitHub Actions': 'Cloud & DevOps',
  'GitLab CI': 'Cloud & DevOps',
  'Linux': 'Cloud & DevOps',
  'Nginx': 'Cloud & DevOps',
  'Git': 'Developer Tools',
  'GitHub': 'Developer Tools',
  'GitLab': 'Developer Tools',
  'Jira': 'Developer Tools',
  'Postman': 'Developer Tools',
  'Figma': 'Developer Tools',
  'Jest': 'Testing & QA',
  'Cypress': 'Testing & QA',
  'Playwright': 'Testing & QA',
  'Selenium': 'Testing & QA',
  'PyTest': 'Testing & QA',
  'Unit Testing': 'Testing & QA',
  'Machine Learning': 'AI & Data Science',
  'Deep Learning': 'AI & Data Science',
  'Artificial Intelligence': 'AI & Data Science',
  'Data Science': 'AI & Data Science',
  'Pandas': 'AI & Data Science',
  'NumPy': 'AI & Data Science',
  'TensorFlow': 'AI & Data Science',
  'PyTorch': 'AI & Data Science',
  'Apache Kafka': 'Cloud & DevOps',
  'RabbitMQ': 'Cloud & DevOps',
  'Apache Spark': 'AI & Data Science',
  'JWT': 'Security & Auth',
  'OAuth 2.0': 'Security & Auth',
};

/**
 * Normalizes any skill name or alias into its canonical form.
 */
function normalizeSkill(skill) {
  if (!skill || typeof skill !== 'string') return '';
  const clean = skill.trim().toLowerCase();
  if (SYNONYMS[clean]) return SYNONYMS[clean];

  // Try punctuation-stripped match
  const stripped = clean.replace(/[-_.]/g, '');
  if (SYNONYMS[stripped]) return SYNONYMS[stripped];

  // Return title-cased original if not in synonym map
  return skill.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Categorizes a canonical skill into a conventional ATS resume section heading.
 */
function getSkillCategory(canonicalSkill) {
  return CATEGORY_MAP[canonicalSkill] || 'Technical Skills';
}

/**
 * Extracts all recognizable skills from a freeform text string.
 */
function extractSkillsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const found = new Set();
  const lowerText = text.toLowerCase();

  // Sort synonym keys by length descending to match longest phrases first (e.g., 'react native' before 'react')
  const keys = Object.keys(SYNONYMS).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    // Word boundary matching, escaping special regex chars
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let pattern;
    if (key.includes('+') || key.includes('#') || key.includes('.')) {
      // For c++, c#, node.js, use lookaround or non-word boundaries
      pattern = new RegExp(`(?:^|[\\s,;()/\\[\\]•-])(${escaped})(?=$|[\\s,;()/\\[\\]•-])`, 'i');
    } else {
      pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    }

    if (pattern.test(lowerText)) {
      found.add(SYNONYMS[key]);
    }
  }

  return Array.from(found);
}

/**
 * Tests if two skills refer to the same technology.
 */
function areSkillsEquivalent(skillA, skillB) {
  if (!skillA || !skillB) return false;
  return normalizeSkill(skillA).toLowerCase() === normalizeSkill(skillB).toLowerCase();
}

module.exports = {
  SYNONYMS,
  normalizeSkill,
  getSkillCategory,
  extractSkillsFromText,
  areSkillsEquivalent,
};
