/**
 * ToolRegistry - Registers and provides access to all agent tools
 * Tools are looked up by name and executed dynamically
 */
const JobDescriptionParser = require('./tools/JobDescriptionParser');
const ResumeParser = require('./tools/ResumeParser');
const KeywordExtractor = require('./tools/KeywordExtractor');
const MatchScorer = require('./tools/MatchScorer');
const ResumeRewriter = require('./tools/ResumeRewriter');
const CoverLetterGenerator = require('./tools/CoverLetterGenerator');
const QAGenerator = require('./tools/QAGenerator');
const ExplanationGenerator = require('./tools/ExplanationGenerator');

class ToolRegistry {
  constructor() {
    this.tools = {};
    this._registerAll();
  }

  _registerAll() {
    const toolList = [
      JobDescriptionParser, ResumeParser, KeywordExtractor, MatchScorer,
      ResumeRewriter, CoverLetterGenerator, QAGenerator, ExplanationGenerator
    ];
    toolList.forEach(tool => {
      this.tools[tool.name] = tool;
      console.log(`🔧 Tool registered: ${tool.name}`);
    });
  }

  async executeTool(name, params) {
    const tool = this.tools[name];
    if (!tool) throw new Error(`Tool '${name}' not found in registry`);
    console.log(`⚡ Executing tool: ${name}`);
    const start = Date.now();
    const result = await tool.run(params);
    console.log(`✅ Tool ${name} completed in ${Date.now() - start}ms`);
    return result;
  }

  getAvailableTools() {
    return Object.keys(this.tools);
  }
}

module.exports = new ToolRegistry();
