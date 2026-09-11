require('dotenv').config();
const mongoose = require('mongoose');
const ScraperAgent = require('./agents/ScraperAgent');
const MatchingAgent = require('./agents/MatchingAgent');
const Job = require('./models/Job');
const JobMatch = require('./models/JobMatch');
const User = require('./models/User');

async function testCycle() {
  await mongoose.connect(process.env.MONGODB_URI);
  let user = await User.findOne({ firebase_uid: 'guest_dev_user' });
  if (!user) user = await User.create({ firebase_uid: 'guest_dev_user', email: 'dev@hireflow.ai', name: 'Dev User' });

  console.log('1. Fetching Adzuna jobs for Frontend & SDE...');
  const scraper = new ScraperAgent();
  const scrapedJobs = await scraper.scrapeAll(['Frontend', 'SDE']);
  console.log('Scraped count:', scrapedJobs.length);

  console.log('2. Saving jobs to MongoDB...');
  for (const job of scrapedJobs) {
    const saved = await Job.findOneAndUpdate(
      { title: job.title, company: job.company },
      { $set: { title: job.title, company: job.company, rawText: job.description, source: 'adzuna', redirectUrl: job.redirectUrl, jobType: job.jobType } },
      { upsert: true, new: true }
    );
    job._id = saved._id;
  }

  console.log('3. Matching jobs...');
  const matcher = new MatchingAgent();
  const resumeData = { skills: ['React', 'JavaScript', 'Node.js', 'HTML', 'CSS'], totalExperienceYears: 2 };
  const matchResults = await matcher.matchAll(resumeData, scrapedJobs);

  console.log('4. Saving matches...');
  for (const m of matchResults) {
    await JobMatch.findOneAndUpdate(
      { userId: user._id, jobId: m.job._id },
      { $set: { userId: user._id, jobId: m.job._id, matchScore: m.matchScore, rank: m.rank } },
      { upsert: true, new: true }
    );
  }

  console.log('5. Querying matches from DB (as GET /api/automation/jobs)...');
  const matches = await JobMatch.find({ userId: user._id }).populate('jobId').sort({ rank: 1 }).lean();
  console.log('FETCHED MATCHES COUNT IN DB:', matches.length);
  matches.slice(0, 5).forEach((m) => console.log(m.rank, m.jobId?.title, '|', m.jobId?.company, '| Score:', m.matchScore, '| Type:', m.jobId?.jobType));
  process.exit(0);
}
testCycle().catch(console.error);
