/**
 * ScraperAgent — Fetches job listings from Adzuna API
 *
 * Data Source: Adzuna Jobs API (https://api.adzuna.com)
 * Fallback: Mock data if API keys not configured or API fails
 *
 * Keeps exactly the same public interface as before:
 *   - scrapeRole(role, resumeSkills)
 *   - scrapeAll(roles, resumeSkills)
 */

const axios = require('axios');

const JOBS_PER_ROLE = 15;

// Map role labels to Adzuna search query strings
const ROLE_QUERIES = {
  'SDE':              'software developer engineer',
  'Frontend':         'frontend developer react',
  'Backend':          'backend developer node',
  'Full Stack':       'full stack developer',
  'Data Science':     'data scientist analyst',
  'Machine Learning': 'machine learning engineer AI',
  'DevOps':           'devops cloud engineer',
  'Mobile':           'mobile developer react native flutter',
  'UI/UX':            'ui ux designer figma',
  'Product':          'product manager',
  'Android':          'android developer kotlin',
  'iOS':              'ios developer swift',
  'Blockchain':       'blockchain solidity web3',
  'Cybersecurity':    'cybersecurity security analyst',
};

// Common tech skills for keyword extraction from job descriptions
const TECH_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'php', 'swift', 'kotlin', 'dart',
  'react', 'angular', 'vue', 'next.js', 'nuxt', 'svelte', 'redux',
  'node.js', 'express', 'fastapi', 'django', 'flask', 'spring', 'rails',
  'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'dynamodb', 'sqlite',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'ansible', 'ci/cd',
  'git', 'linux', 'bash', 'graphql', 'rest', 'grpc', 'microservices',
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn', 'pandas', 'numpy',
  'figma', 'adobe xd', 'sketch', 'prototyping',
  'flutter', 'react native', 'ios', 'android',
  'blockchain', 'solidity', 'web3', 'ethereum',
  'sql', 'nosql', 'tableau', 'power bi',
];

/**
 * Infer job type from title and description
 */
function inferJobType(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  if (/intern|internship|trainee|apprentice/.test(text)) return 'internship';
  if (/full[- ]?time|permanent|sde|senior|lead|principal/.test(text)) return 'full-time';
  if (/part[- ]?time/.test(text)) return 'part-time';
  if (/contract|freelance/.test(text)) return 'contract';
  return 'unknown';
}

/**
 * Extract tech skills mentioned in a text block
 */
function extractSkills(description = '') {
  const lowerDesc = description.toLowerCase();
  return TECH_SKILLS.filter(skill => lowerDesc.includes(skill.toLowerCase()));
}

class ScraperAgent {
  constructor() {
    this.appId   = process.env.ADZUNA_APP_ID;
    this.appKey  = process.env.ADZUNA_APP_KEY;
    this.country = process.env.ADZUNA_COUNTRY || 'in';
    this.apiConfigured = !!(this.appId && this.appKey
      && this.appId !== 'your_adzuna_app_id'
      && this.appKey !== 'your_adzuna_app_key');

    if (!this.apiConfigured) {
      console.warn('[ScraperAgent] ⚠️  ADZUNA_APP_ID or ADZUNA_APP_KEY not configured — will use mock data fallback');
    }
  }

  /**
   * Fetch jobs for a single role from Adzuna API
   * @param {string} role - e.g. 'SDE', 'Frontend'
   * @param {string[]} resumeSkills - skills from parsed resume (used in mock fallback)
   */
  async scrapeRole(role, resumeSkills = []) {
    const query = ROLE_QUERIES[role] || role;
    console.log(`[ScraperAgent] Fetching Adzuna jobs | role: ${role} | query: "${query}" | country: ${this.country}`);

    if (!this.apiConfigured) {
      return this._getMockJobs(role, resumeSkills);
    }

    try {
      const response = await axios.get(`https://api.adzuna.com/v1/api/jobs/${this.country}/search/1`, {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'HireFlow-AI/1.0',
        },
        params: {
          app_id:           this.appId,
          app_key:          this.appKey,
          what:             query,
          results_per_page: Math.min(JOBS_PER_ROLE, 20),
        },
      });

      const results = response.data?.results || [];
      if (results.length === 0) {
        console.log(`[ScraperAgent] No results from Adzuna for "${query}" — using mock fallback`);
        return this._getMockJobs(role, resumeSkills);
      }

      const stripHtml = (str = '') => str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

      const jobs = results.slice(0, JOBS_PER_ROLE).map(job => {
        const rawTitle    = stripHtml(job.title || '');
        const company     = stripHtml(job.company?.display_name || 'Unknown Company');
        const description = stripHtml(job.description || job.snippet || '');
        const redirectUrl = job.redirect_url || '';
        const skills      = extractSkills(description);
        const jobType     = inferJobType(rawTitle, description);

        return {
          title:          rawTitle || `${role} Role`,
          company,
          description,
          skillsRequired: skills.length > 0 ? skills : resumeSkills.slice(0, 4),
          keywords:       skills.map(s => s.toLowerCase()),
          source:         'adzuna',
          sourceUrl:      `https://api.adzuna.com/v1/api/jobs/${this.country}/search/1?what=${encodeURIComponent(query)}`,
          redirectUrl,
          jobType,
          role,
        };
      });

      console.log(`[ScraperAgent] ✅ Adzuna returned ${jobs.length} live jobs for role: ${role}`);
      return jobs;

    } catch (err) {
      console.warn(`[ScraperAgent] Adzuna API failed for "${role}": ${err.message} — using mock fallback`);
      return this._getMockJobs(role, resumeSkills);
    }
  }

  // ---------------------------------------------------------------------------
  // Mock data fallback (resume-skills-aware, realistic listings)
  // ---------------------------------------------------------------------------
  _getMockJobs(role, resumeSkills = []) {
    const skillsTop = resumeSkills.slice(0, 5);

    const mockDB = {
      'SDE': [
        { title: 'Software Development Engineer', company: 'TechNova Solutions', description: 'Build scalable backend systems using Node.js, Python, and REST APIs. Work with MongoDB, Redis, and AWS. Participate in architecture decisions and code reviews with a senior engineering team.', redirectUrl: '' },
        { title: 'Junior Software Engineer Intern', company: 'InnovateTech', description: 'Develop and test web applications using JavaScript and SQL. Collaborate with senior engineers. Git-based workflow in an agile team environment.', redirectUrl: '' },
        { title: 'Backend Software Engineer', company: 'CloudScale Systems', description: 'Design microservices, REST APIs, and database schemas. Strong Python or Node.js required. Docker and Kubernetes experience preferred.', redirectUrl: '' },
      ],
      'Frontend': [
        { title: 'Frontend Developer', company: 'PixelForge', description: 'Build responsive React.js applications with TypeScript. Work with Redux, REST APIs, and Figma designs. Focus on performance and accessibility.', redirectUrl: '' },
        { title: 'React Developer Intern', company: 'WebWave Technologies', description: 'Develop reusable React components. Integrate REST APIs. Optimize core web vitals. Work in a fast-paced SaaS environment.', redirectUrl: '' },
        { title: 'UI Engineer', company: 'Interfaced Labs', description: 'Create production-grade React interfaces with TypeScript. Work closely with product and design on Next.js applications.', redirectUrl: '' },
      ],
      'Backend': [
        { title: 'Backend Engineer', company: 'DataFlow Systems', description: 'Design RESTful APIs, define MongoDB schemas, build Docker-containerized services. Strong Python or Node.js required.', redirectUrl: '' },
        { title: 'Backend Intern', company: 'CloudNine Tech', description: 'Build Python FastAPI microservices integrated with PostgreSQL, Redis, and Docker. Write unit tests. Work in an agile team.', redirectUrl: '' },
        { title: 'API Engineer', company: 'Streamline Corp', description: 'Develop high-performance backend services in Node.js. Work with GraphQL, REST, PostgreSQL, and CI/CD pipelines.', redirectUrl: '' },
      ],
      'Full Stack': [
        { title: 'Full Stack Developer', company: 'Fusion Labs', description: 'Build end-to-end features with React frontend and Node.js backend. Deploy on AWS using MongoDB. Implement CI/CD pipelines.', redirectUrl: '' },
        { title: 'MERN Stack Developer Intern', company: 'DigitalCraft', description: 'Work on MongoDB, Express, React, and Node.js stack. Build dashboards and RESTful APIs in an agile startup environment.', redirectUrl: '' },
        { title: 'Full Stack Engineer', company: 'ProductHive', description: 'Own features end to end. React + TypeScript frontend, Python FastAPI backend, PostgreSQL database. Deployed on GCP.', redirectUrl: '' },
      ],
      'Data Science': [
        { title: 'Data Scientist', company: 'Analytics Hub', description: 'Build ML models with Python, Pandas, Scikit-learn. Create Tableau dashboards. Run A/B tests and statistical analyses on large datasets.', redirectUrl: '' },
        { title: 'Data Analyst Intern', company: 'Insight Systems', description: 'Analyze structured and unstructured data using Python, SQL, Power BI. Build automated reporting pipelines. Strong Excel and statistics skills.', redirectUrl: '' },
        { title: 'ML Data Scientist', company: 'DataViz Corp', description: 'Apply machine learning to business problems. Python, Scikit-learn, deep learning, and data pipelines. Experience with AWS SageMaker preferred.', redirectUrl: '' },
      ],
      'Machine Learning': [
        { title: 'ML Engineer', company: 'DeepLearn AI', description: 'Research and implement deep learning models for NLP tasks using PyTorch, Transformers, and MLOps pipelines. Docker and CUDA experience helpful.', redirectUrl: '' },
        { title: 'AI Research Intern', company: 'Neural Systems', description: 'Work on generative AI using Hugging Face, LLMs, RAG, and PEFT fine-tuning. Python and GPU (CUDA) proficiency required.', redirectUrl: '' },
        { title: 'Computer Vision Engineer', company: 'VisionCore AI', description: 'Build real-time CV pipelines using PyTorch and OpenCV. Work on object detection, segmentation, and model deployment with TensorRT.', redirectUrl: '' },
      ],
      'DevOps': [
        { title: 'DevOps Engineer', company: 'InfraScale', description: 'Manage CI/CD pipelines, Kubernetes clusters, and Terraform infrastructure on AWS. Linux, Docker, and Helm required.', redirectUrl: '' },
        { title: 'Cloud Infrastructure Intern', company: 'CloudOps Pro', description: 'Manage AWS and GCP resources. Implement monitoring with Prometheus/Grafana. Terraform and Ansible automation experience a plus.', redirectUrl: '' },
        { title: 'Site Reliability Engineer', company: 'ReliableOps', description: 'Own production uptime. Work with Kubernetes, Terraform, Datadog, and AWS. Implement incident response processes and SLOs.', redirectUrl: '' },
      ],
      'Mobile': [
        { title: 'Mobile Developer', company: 'AppForge', description: 'Build cross-platform apps with React Native and TypeScript. Integrate Firebase and REST APIs. App Store and Play Store deployment.', redirectUrl: '' },
        { title: 'Flutter Developer Intern', company: 'MobileFirst Studio', description: 'Develop Flutter apps for iOS and Android using Dart, Firebase, REST APIs and Riverpod state management.', redirectUrl: '' },
      ],
      'UI/UX': [
        { title: 'UI/UX Designer', company: 'DesignHive', description: 'Create wireframes, prototypes, and high-fidelity designs in Figma. Conduct user research and usability testing. Build and maintain design systems.', redirectUrl: '' },
        { title: 'Product Design Intern', company: 'UX Studio', description: 'Collaborate with PMs and engineers to design user journeys. Use Figma, Adobe XD, and CSS to deliver excellent user experiences.', redirectUrl: '' },
      ],
    };

    const templates = mockDB[role];
    const base = templates || [
      { title: `${role} Engineer`, company: 'TechCorp', description: `Work on exciting ${role} projects using cutting-edge technology. Required skills: ${skillsTop.join(', ')}.`, redirectUrl: '' },
      { title: `${role} Intern`, company: 'StartupHub', description: `Fast-paced internship in ${role}. Build real products from day one. Skills: ${skillsTop.slice(0, 3).join(', ')}.`, redirectUrl: '' },
    ];

    return base.slice(0, JOBS_PER_ROLE).map(t => {
      const skills = extractSkills(t.description);
      return {
        title:          t.title,
        company:        t.company,
        description:    t.description,
        skillsRequired: skills.length > 0 ? skills : (skillsTop.length > 0 ? skillsTop : ['Communication', 'Problem Solving']),
        keywords:       (skills.length > 0 ? skills : skillsTop).map(s => s.toLowerCase()),
        source:         'adzuna',
        sourceUrl:      'https://www.adzuna.com',
        redirectUrl:    t.redirectUrl || '',
        jobType:        inferJobType(t.title, t.description),
      };
    });
  }

  /**
   * Fetch jobs for all selected roles
   * @param {string[]} roles
   * @param {string[]} resumeSkills
   */
  async scrapeAll(roles, resumeSkills = []) {
    const allJobs = [];
    for (const role of roles) {
      try {
        const jobs = await this.scrapeRole(role, resumeSkills);
        jobs.forEach(j => allJobs.push({ ...j, role }));
      } catch (err) {
        console.error(`[ScraperAgent] Fatal error for role ${role}:`, err.message);
        const mocks = this._getMockJobs(role, resumeSkills);
        mocks.forEach(j => allJobs.push({ ...j, role }));
      }
    }
    console.log(`[ScraperAgent] Total jobs fetched: ${allJobs.length}`);
    return allJobs;
  }
}

module.exports = ScraperAgent;
